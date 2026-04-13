import axios from 'axios';
import { Checkbox, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';


const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Format file size with appropriate unit
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const MAX_IMAGE_DIMENSION = 1600;
const MIN_IMAGE_DIMENSION = 960;
const MAX_COMPRESSED_IMAGE_SIZE = 2 * 1024 * 1024;
const DEFAULT_IMAGE_QUALITY = 0.82;
const MIN_IMAGE_QUALITY = 0.6;

const getErrorMessage = (error) => {
  const responseData = error.response?.data;
  if (typeof responseData === 'string' && responseData) return responseData;
  if (responseData?.message) return responseData.message;
  return error.message || '未知错误';
};

const replaceFileExtension = (fileName, extension) => {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return `${baseName}.${extension}`;
};

const getExtensionFromMimeType = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
};

const loadImage = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new window.Image();

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('图片读取失败'));
  };

  image.src = objectUrl;
});

const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }
    reject(new Error('图片压缩失败'));
  }, mimeType, quality);
});

const compressImageFile = async (file) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return { file, compressed: false, bytesSaved: 0 };
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return { file, compressed: false, bytesSaved: 0 };
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceMaxEdge = Math.max(sourceWidth, sourceHeight);
  const downscaleRatio = sourceMaxEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / sourceMaxEdge : 1;

  let targetWidth = Math.max(1, Math.round(sourceWidth * downscaleRatio));
  let targetHeight = Math.max(1, Math.round(sourceHeight * downscaleRatio));
  let quality = DEFAULT_IMAGE_QUALITY;
  let compressedBlob = null;

  const targetMimeType = file.type === 'image/png' || file.type === 'image/webp'
    ? 'image/webp'
    : 'image/jpeg';

  while (true) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    compressedBlob = await canvasToBlob(canvas, targetMimeType, quality);
    const longestEdge = Math.max(targetWidth, targetHeight);

    if (compressedBlob.size <= MAX_COMPRESSED_IMAGE_SIZE) break;

    if (quality > MIN_IMAGE_QUALITY) {
      quality = Math.max(MIN_IMAGE_QUALITY, quality - 0.08);
      continue;
    }

    if (longestEdge <= MIN_IMAGE_DIMENSION) break;

    targetWidth = Math.max(1, Math.round(targetWidth * 0.85));
    targetHeight = Math.max(1, Math.round(targetHeight * 0.85));
  }

  if (!compressedBlob || compressedBlob.size >= file.size) {
    return { file, compressed: false, bytesSaved: 0 };
  }

  const nextMimeType = compressedBlob.type || targetMimeType;
  const compressedFile = new File(
    [compressedBlob],
    replaceFileExtension(file.name, getExtensionFromMimeType(nextMimeType)),
    {
      type: nextMimeType,
      lastModified: file.lastModified,
    }
  );

  return {
    file: compressedFile,
    compressed: true,
    bytesSaved: file.size - compressedFile.size,
  };
};

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 600,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 2,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const CreatePostModal = ({ open, handleClose, onSubmitSuccess, defaultFavorite = false }) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [keepOriginalImage, setKeepOriginalImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const hasImageFiles = files.some((file) => file.type.startsWith('image/'));


  // 处理剪贴板粘贴事件
  useEffect(() => {
    const handlePaste = async (e) => {
      // 只在模态框打开时处理粘贴事件
      if (!open) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // 为粘贴的图片生成一个有意义的文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = file.type.split('/')[1] || 'png';
            const renamedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
              type: file.type
            });
            imageFiles.push(renamedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        // 将粘贴的图片添加到现有文件列表中
        setFiles(prevFiles => [...prevFiles, ...imageFiles]);

        // 显示成功消息
        if (onSubmitSuccess) {
          onSubmitSuccess(`已从剪贴板添加 ${imageFiles.length} 张图片`, false, false);
        }
      }
    };

    // 添加全局粘贴事件监听器
    document.addEventListener('paste', handlePaste);

    // 清理函数
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [open, onSubmitSuccess]);

  const resetForm = () => {
    setContent('');
    setFiles([]);
    setFileInputKey(Date.now());
    setKeepOriginalImage(false);
  };

  const createParcel = async () => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (defaultFavorite) formData.append('favorite', 'true');

    const response = await axios.post('/api/create', formData, {
      withCredentials: true,
    });

    const parcelId = response.data?.id;
    if (!parcelId) {
      throw new Error('创建内容失败');
    }

    return parcelId;
  };

  const deleteParcel = async (parcelId) => {
    await axios.post(`/api/delete?id=${parcelId}`, {}, {
      withCredentials: true,
    });
  };

  const prepareFileForUpload = async (file) => {
    if (!file.type.startsWith('image/') || keepOriginalImage) {
      return { file, compressed: false, bytesSaved: 0 };
    }

    try {
      return await compressImageFile(file);
    } catch (error) {
      console.warn('Image compression failed, fallback to original file:', error);
      return { file, compressed: false, bytesSaved: 0 };
    }
  };

  const uploadFile = async (parcelId, file, fileIndex, totalFiles) => {
    const formData = new FormData();
    formData.append('file', file);

    await axios.post(`/api/attachment?id=${parcelId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      onUploadProgress: (progressEvent) => {
        const fileProgress = progressEvent.total
          ? progressEvent.loaded / progressEvent.total
          : 0;
        const totalProgress = ((fileIndex + fileProgress) / totalFiles) * 100;
        setUploadProgress(Math.round(totalProgress));
      },
    });
  };

  const handleSubmit = async () => {
    if (!content && files.length === 0) {
      // 使用父组件的showMessage函数，通过onSubmitSuccess回调传递消息
      if (onSubmitSuccess) onSubmitSuccess('请填写内容或选择文件', true, false);
      return;
    }

    let parcelId = null;
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStatus('正在创建内容...');

      parcelId = await createParcel();

      let compressedCount = 0;
      let totalBytesSaved = 0;

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        setUploadStatus(`正在${keepOriginalImage && currentFile.type.startsWith('image/') ? '准备原图' : '处理'} ${i + 1}/${files.length}: ${currentFile.name}`);
        const preparedFile = await prepareFileForUpload(currentFile);

        if (preparedFile.compressed) {
          compressedCount += 1;
          totalBytesSaved += preparedFile.bytesSaved;
        }

        setUploadStatus(`正在上传 ${i + 1}/${files.length}: ${preparedFile.file.name}`);
        await uploadFile(parcelId, preparedFile.file, i, files.length);
      }

      setUploadProgress(100);
      resetForm();

      // 关闭Modal并通知父组件刷新列表
      handleClose();

      let successMessage = '提交成功';
      if (files.length > 0) {
        successMessage += `，已逐张上传 ${files.length} 个文件`;
      }
      if (defaultFavorite) {
        successMessage += '，已默认加入星标';
      }
      if (keepOriginalImage && hasImageFiles) {
        successMessage += '，图片保持原图上传';
      }
      if (compressedCount > 0 && totalBytesSaved > 0) {
        successMessage += `，压缩节省 ${formatFileSize(totalBytesSaved)}`;
      }

      if (onSubmitSuccess) onSubmitSuccess(successMessage, false, true);
    } catch (error) {
      let rollbackFailed = false;

      if (parcelId) {
        try {
          await deleteParcel(parcelId);
        } catch (rollbackError) {
          rollbackFailed = true;
          console.error('Failed to rollback parcel after upload error:', rollbackError);
        }
      }

      let errorMessage = `提交失败: ${getErrorMessage(error)}`;
      if (parcelId && !rollbackFailed) {
        errorMessage += '，未完成记录已回滚';
      }
      if (rollbackFailed) {
        errorMessage += '，且自动回滚失败，请手动删除该记录';
      }

      if (onSubmitSuccess) onSubmitSuccess(errorMessage, true, false);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  return (
    <Modal
      open={open}
      onClose={uploading ? undefined : handleClose}
      aria-labelledby="create-post-modal"
      aria-describedby="modal-to-create-new-post"
    >
      <Box sx={modalStyle}>
        <Box sx={{ p: 4, pb: 2 }}>
          <Typography variant="h6" component="h2">
            {defaultFavorite ? '创建收藏内容' : '创建新内容'}
          </Typography>
        </Box>
        
        <Box sx={{ p: 4, py: 0, overflowY: 'auto', flex: 1 }}>
          <Box width="100%" mb={2}>
            <TextareaAutosize
              value={content}
              onChange={(e) => setContent(e.target.value)}
              minRows={5}
              maxRows={15}
              style={{ width: '100%', resize: 'none' }}
              placeholder="输入内容..."
              disabled={uploading}
            />
            {!isXs &&
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 提示：可以直接使用 Ctrl+V 粘贴剪贴板中的图片
              </Typography>
            }
          </Box>

          {/* Upload progress bar */}
          {uploading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                上传进度: {uploadProgress}%
              </Typography>
              {uploadStatus && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {uploadStatus}
                </Typography>
              )}
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}


          {/* 文件列表显示 */}
          {files.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1,
                  flexWrap: 'wrap'
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  已选择的文件:
                </Typography>
                {hasImageFiles && (
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={keepOriginalImage}
                        onChange={(e) => setKeepOriginalImage(e.target.checked)}
                        disabled={uploading}
                      />
                    )}
                    label="保持原图"
                    sx={{ mr: 0 }}
                  />
                )}
              </Box>
              {keepOriginalImage && hasImageFiles && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  已关闭前置压缩，图片将按原始尺寸逐张上传。
                </Typography>
              )}
              {hasImageFiles && (
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {keepOriginalImage ? '原图上传模式' : '默认会先压缩图片再上传'}
                </Typography>
              )}
              <Box sx={{ maxHeight: '150px', overflow: 'auto' }}>
                {files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 0.5,
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      borderRadius: 1,
                      border: '1px solid rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {file.type.startsWith('image/') ? (
                        <Image sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
                      ) : (
                        <Attachment sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({formatFileSize(file.size)})
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                      }}
                      disabled={uploading}
                      sx={{ ml: 1 }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* 操作按钮组 */}
        <Box sx={{
          p: 4,
          pt: 2,
          display: 'flex',
          gap: 1,
          justifyContent: 'space-between'
        }}>
          {/* 上传按钮 */}
          <Button
            component="label"
            variant="outlined"
            startIcon={!isXs && <CloudUpload />}
            disabled={uploading}
          >
            选择文件
            <VisuallyHiddenInput
              type="file"
              onChange={(e) => setFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files || [])])}
              key={fileInputKey}
              multiple
              disabled={uploading}
            />
          </Button>

          <Box sx={{
            display: 'inline-flex',
            gap: 1,
            justifyContent: 'flex-end'
          }}>
            <Button
              variant="outlined"
              startIcon={!isXs && <Cancel />}
              onClick={handleClose}
              disabled={uploading}
            >
              取消
            </Button>
            <Button
              variant="contained"
              startIcon={!isXs && <Send />}
              onClick={handleSubmit}
              disabled={uploading}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              {uploading ? '上传中...' : '发送'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreatePostModal;

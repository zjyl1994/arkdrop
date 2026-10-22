import axios from 'axios';
import { newUploadKey, uploadAttachment } from '../utils/upload';
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

const FileButtonInput = styled('input')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  zIndex: 1,
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

const CreatePostModal = ({ open, handleClose, onSubmitSuccess, defaultFavorite = false, onUploadingChange, onPendingChange }) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [keepOriginalImage, setKeepOriginalImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const parcelRef = useRef(null);
  const createKeyRef = useRef(null);
  const uploadKeysRef = useRef(new Map());
  const attemptedUploadsRef = useRef(new Set());
  const completedRef = useRef(new Set());
  const preparedRef = useRef(new Map());
  const busyRef = useRef(false);
  const [fileStates, setFileStates] = useState({});
  const [hasSession, setHasSession] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const patchFile = (index, state) => setFileStates((previous) => ({ ...previous, [index]: state }));

  useEffect(() => {
    onPendingChange?.(uploading || hasSession || files.length > 0 || content.length > 0);
  }, [uploading, hasSession, files.length, content, onPendingChange]);

  useEffect(() => {
    if (!uploading && !hasSession) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading, hasSession]);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const hasImageFiles = files.some((file) => file.type.startsWith('image/'));


  // 处理剪贴板粘贴事件
  useEffect(() => {
    const handlePaste = async (e) => {
      // 只在模态框打开时处理粘贴事件
      if (!open || uploading || hasSession) return;

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
  }, [open, onSubmitSuccess, uploading, hasSession]);

  const resetForm = () => {
    setContent('');
    setFiles([]);
    setFileInputKey(Date.now());
    setKeepOriginalImage(false);
    parcelRef.current = null;
    createKeyRef.current = null;
    uploadKeysRef.current.clear();
    attemptedUploadsRef.current.clear();
    completedRef.current.clear();
    preparedRef.current.clear();
    setFileStates({});
    setHasSession(false);
    setSubmitError('');
  };

  const handleFileInputChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length === 0) {
      return;
    }

    setFiles((prevFiles) => [...prevFiles, ...nextFiles]);
  };

  const createParcel = async () => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (defaultFavorite) formData.append('favorite', 'true');

    createKeyRef.current ||= newUploadKey();
    const response = await axios.post('/api/create', formData, {
      withCredentials: true,
      headers: { 'X-Upload-Key': createKeyRef.current },
    });

    const parcelId = response.data?.id;
    if (!parcelId) {
      throw new Error('创建内容失败');
    }

    return parcelId;
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

  const uploadFile = async (parcelId, file, index, completedBytes, totalBytes) => {
    if (!uploadKeysRef.current.has(index)) uploadKeysRef.current.set(index, newUploadKey());
    const checkExisting = attemptedUploadsRef.current.has(index);
    attemptedUploadsRef.current.add(index);
    return uploadAttachment({
      parcelId, file, key: uploadKeysRef.current.get(index), checkExisting,
      onProgress: (event) => {
        const fraction = event.total ? event.loaded / event.total : 0;
        setUploadProgress(Math.min(99, Math.round((completedBytes + file.size * fraction) / Math.max(1, totalBytes) * 100)));
      },
    });
  };

  const handleSubmit = async () => {
    if (!content && files.length === 0) {
      // 使用父组件的showMessage函数，通过onSubmitSuccess回调传递消息
      if (onSubmitSuccess) onSubmitSuccess('请填写内容或选择文件', true, false);
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;
    setUploading(true);
    onUploadingChange?.(true);
    setSubmitError('');
    setHasSession(true);
    try {
      // Prepare once so retries reuse the same bytes and progress is byte weighted.
      for (let i = 0; i < files.length; i++) {
        if (!preparedRef.current.has(i)) {
          patchFile(i, '正在处理');
          setUploadStatus(`正在处理 ${i + 1}/${files.length}: ${files[i].name}`);
          preparedRef.current.set(i, await prepareFileForUpload(files[i]));
          patchFile(i, '等待上传');
        }
      }
      const totalBytes = files.reduce((sum, _, i) => sum + preparedRef.current.get(i).file.size, 0);
      let completedBytes = [...completedRef.current].reduce((sum, i) => sum + preparedRef.current.get(i).file.size, 0);
      setUploadProgress(totalBytes ? Math.round(completedBytes / totalBytes * 100) : 0);
      if (!parcelRef.current) {
        setUploadStatus('正在创建内容…');
        parcelRef.current = await createParcel();
        setHasSession(true);
      }
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        if (completedRef.current.has(i)) continue;
        const file = preparedRef.current.get(i).file;
        patchFile(i, '上传中');
        setUploadStatus(`正在上传 ${i + 1}/${files.length}: ${file.name}`);
        try {
          await uploadFile(parcelRef.current, file, i, completedBytes, totalBytes);
          completedRef.current.add(i);
          completedBytes += file.size;
          patchFile(i, '已完成');
          window.dispatchEvent(new Event('arkdrop-list-change'));
        } catch (error) {
          if ([404, 410].includes(error.response?.status)) {
            // The temporary parcel may have expired or been removed on another device.
            parcelRef.current = null;
            createKeyRef.current = null;
            uploadKeysRef.current.clear();
            attemptedUploadsRef.current.clear();
            completedRef.current.clear();
            preparedRef.current.clear();
            setHasSession(false);
            setFileStates({});
            throw new Error('临时记录已过期或被删除，请重新发送');
          }
          failed += 1;
          patchFile(i, `失败：${getErrorMessage(error)}`);
        }
      }
      if (failed) {
        setSubmitError(`${failed} 个文件未确认上传成功，已完成文件会保留。重试时会先确认服务器接收状态。`);
        setUploadStatus('部分文件上传失败');
      } else {
        setUploadProgress(100);
        resetForm();
        handleClose();
        onSubmitSuccess?.('发送成功', false, true);
      }
    } catch (error) {
      if ([404, 410].includes(error.response?.status)) {
        parcelRef.current = null;
        createKeyRef.current = null;
        uploadKeysRef.current.clear();
        attemptedUploadsRef.current.clear();
        preparedRef.current.clear();
        completedRef.current.clear();
        setFileStates({});
        setHasSession(false);
      }
      setSubmitError(`发送失败：${getErrorMessage(error)}`);
    } finally {
      window.dispatchEvent(new Event('arkdrop-list-change'));
      busyRef.current = false;
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const closeComposer = () => {
    if (!uploading) {
      if (hasSession) onSubmitSuccess?.('已保留服务器收到的内容；未完成文件已从发送队列移除', false, true);
      resetForm();
    }
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={closeComposer}
      aria-labelledby="create-post-modal"
      aria-describedby="modal-to-create-new-post"
    >
      <Box sx={modalStyle}>
        <Box sx={{ p: 4, pb: 2 }}>
          <Typography variant="h6" component="h2">
            {defaultFavorite ? '添加到收藏' : '添加内容'}
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
              placeholder="写点内容，或直接粘贴文字、图片"
              disabled={uploading || hasSession}
            />
            {!isXs &&
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                小提示：可以直接按 Ctrl+V 粘贴图片
              </Typography>
            }
          </Box>

          {submitError && <Alert severity="warning" sx={{ mb: 2 }}>{submitError}</Alert>}
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
                        disabled={uploading || hasSession}
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
                        ({formatFileSize(file.size)}) {fileStates[index] || '等待发送'}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
                      }}
                      disabled={uploading || hasSession}
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
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              variant="outlined"
              startIcon={!isXs && <CloudUpload />}
              disabled={uploading || hasSession}
              tabIndex={-1}
            >
              选择文件
            </Button>
            <FileButtonInput
              aria-label="选择文件"
              type="file"
              onChange={handleFileInputChange}
              key={fileInputKey}
              multiple
              disabled={uploading || hasSession}
            />
          </Box>

          <Box sx={{
            display: 'inline-flex',
            gap: 1,
            justifyContent: 'flex-end'
          }}>
            <Button
              variant="outlined"
              startIcon={!isXs && <Cancel />}
              onClick={closeComposer}
            >
              {uploading ? '收起' : hasSession ? '结束本次发送' : '取消'}
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
              {uploading ? '上传中...' : hasSession ? '重试失败项' : '发送'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreatePostModal;

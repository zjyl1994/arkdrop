import axios from 'axios';
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

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const CreatePostModal = ({ open, handleClose, onSubmitSuccess }) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));

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
          onSubmitSuccess(`已从剪贴板添加 ${imageFiles.length} 张图片`, false);
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

  const handleSubmit = async () => {
    if (!content && files.length === 0) {
      // 使用父组件的showMessage函数，通过onSubmitSuccess回调传递消息
      if (onSubmitSuccess) onSubmitSuccess('请填写内容或选择文件', true);
      return;
    }

    const formData = new FormData();
    if (content) formData.append('content', content);
    files.forEach((file) => formData.append('files', file));

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await axios.post('/api/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      // 清空表单
      setContent('');
      setFiles([]);
      setFileInputKey(Date.now());
      setUploadProgress(0);

      // 关闭Modal并通知父组件刷新列表
      handleClose();
      if (onSubmitSuccess) onSubmitSuccess('提交成功: ' + JSON.stringify(response.data));
    } catch (error) {
      if (onSubmitSuccess) onSubmitSuccess('提交失败: ' + (error.response?.data?.message || error.message), true);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="create-post-modal"
      aria-describedby="modal-to-create-new-post"
    >
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" mb={2}>
          创建新内容
        </Typography>
        <Box width="100%" mb={2}>
          <TextareaAutosize
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', minHeight: '100px' }}
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
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}


        {/* 文件列表显示 */}
        {files.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              已选择的文件:
            </Typography>
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

        {/* 操作按钮组 */}
        <Box sx={{
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
              onChange={(e) => setFiles(Array.from(e.target.files))}
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
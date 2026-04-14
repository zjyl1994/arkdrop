import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import LinkRounded from '@mui/icons-material/LinkRounded';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// Format file size with appropriate unit
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatLinkExpireText = (seconds) => {
  if (!seconds || seconds <= 0) return '稍后会失效';
  if (seconds < 60) return '1分钟内有效';

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}分钟内有效`;

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}小时内有效`;

  const days = Math.ceil(hours / 24);
  return `${days}天内有效`;
};

const DataListItem = ({
  item,
  expireSeconds,
  imagePreviewCol,
  onFavorite,
  onCopyMessage,
  onDelete,
  onImagePreview
}) => {
  // Calculate TTL progress
  const calculateTTLProgress = (item, currentTime) => {
    if (item.favorite || !expireSeconds || expireSeconds === 0) return null;

    const now = Math.floor(currentTime / 1000);
    const expireTime = item.created_at + expireSeconds;
    const remainingTime = expireTime - now;

    if (remainingTime <= 0) return { progress: 0, timeLeft: '已过期' };

    const progress = (remainingTime / expireSeconds) * 100;

    // Format remaining time
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = remainingTime % 60;

    let timeLeft = '';
    if (hours > 0) {
      timeLeft = `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      timeLeft = `${minutes}分钟${seconds}秒`;
    } else {
      timeLeft = `${seconds}秒`;
    }

    return { progress, timeLeft };
  };

  const imageList = item.attachments.filter(x => x.content_type.startsWith('image/'));
  const hasContent = item.content && item.content.trim().length > 0;
  const hasAttachments = item.attachments.length > 0;
  const shouldTrackTTL = !item.favorite && !!expireSeconds;
  const createdAt = dayjs.unix(item.created_at);
  const dateString = createdAt.format('YYYY-MM-DD HH:mm:ss');
  const relativeDateString = createdAt.fromNow();
  const [ttlCurrentTime, setTtlCurrentTime] = useState(() => Date.now());
  const ttlInfo = calculateTTLProgress(item, ttlCurrentTime);
  const timeTooltip = ttlInfo ? `${dateString} · 剩余 ${ttlInfo.timeLeft}` : dateString;

  useEffect(() => {
    if (!shouldTrackTTL) {
      return undefined;
    }

    setTtlCurrentTime(Date.now());
    const interval = setInterval(() => {
      setTtlCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [expireSeconds, item.created_at, item.favorite, shouldTrackTTL]);

  const handleCopyContent = async () => {
    try {
      const clipboardData = {};
      const blobs = [];

      // Add text content if available
      if (hasContent) {
        const textBlob = new Blob([item.content], { type: 'text/plain' });
        clipboardData['text/plain'] = textBlob;
        blobs.push(textBlob);
      }

      // Add first image if available
      if (imageList.length > 0) {
        const imageFile = imageList[0];
        const imageUrl = `/files/${imageFile.file_path}`;
        
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = imageUrl;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (imageBlob) {
            clipboardData['image/png'] = imageBlob;
            blobs.push(imageBlob);
          }
        } catch (imgError) {
          console.error('Failed to process image for clipboard:', imgError);
        }
      }

      if (Object.keys(clipboardData).length > 0) {
        await navigator.clipboard.write([new ClipboardItem(clipboardData)]);
        
        if (hasContent && imageList.length > 0) {
          onCopyMessage?.('文本和图片已复制到剪贴板');
        } else if (hasContent) {
          onCopyMessage?.('文本内容已复制到剪贴板');
        } else {
          onCopyMessage?.('图片已复制到剪贴板');
        }
      }
    } catch (err) {
      console.error('Failed to copy content: ', err);
      // Fallback for simple text copy if ClipboardItem fails (e.g. unsupported browser)
      if (hasContent) {
        try {
          await navigator.clipboard.writeText(item.content);
          onCopyMessage?.('文本内容已复制到剪贴板 (仅文本)');
        } catch (fallbackErr) {
           console.error('Fallback copy failed:', fallbackErr);
        }
      }
    }
  };

  const handleCopyAttachmentLink = async (file) => {
    if (!navigator.clipboard?.writeText) {
      onCopyMessage?.('当前环境暂不支持直接复制链接，请换个浏览器再试');
      return;
    }

    try {
      const res = await axios.get(`/api/attachment/share-link?id=${file.id}`, {
        withCredentials: true,
      });
      const shareLink = new URL(res.data.path, window.location.origin).toString();

      await navigator.clipboard.writeText(shareLink);

      onCopyMessage?.(`下载链接已复制，${formatLinkExpireText(res.data.expires_in_seconds)}`);
    } catch (error) {
      console.error('Failed to create attachment share link:', error);

      if (error?.name === 'NotAllowedError') {
        onCopyMessage?.('复制失败，请允许浏览器访问剪贴板后再试');
        return;
      }

      onCopyMessage?.('生成或复制下载链接失败，请稍后再试');
    }
  };

  return (
    <ListItem
      alignItems="flex-start"
      sx={{
        px: { xs: 1.25, sm: 1.75 },
        py: { xs: 0.75, sm: 1 },
      }}
    >
      <ListItemAvatar sx={{ display: { xs: 'none', sm: 'flex' }, minWidth: 44 }}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {hasContent ? <TextSnippet /> : hasAttachments ? (imageList.length > 0 ? <Image /> : <Attachment />) : <Inbox />}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        sx={{
          my: 0,
          pr: { xs: 0.5, sm: 1.25 },
          ml: { xs: 0, sm: 0 }
        }}
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mb: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Tooltip title={timeTooltip} arrow>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    fontSize: '0.75rem',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {relativeDateString}
                </Typography>
              </Tooltip>
            </Box>
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.125 }}>
              <IconButton
                size="small"
                aria-label="favorite"
                onClick={() => onFavorite(item.id)}
                title={item.favorite ? "取消收藏" : "收藏"}
                sx={{ p: 0.5 }}
              >
                {item.favorite ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}
              </IconButton>
              {(hasContent || imageList.length > 0) && (
                 <IconButton size="small" aria-label="copy" onClick={handleCopyContent} title="复制内容" sx={{ p: 0.5 }}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                )}
              <IconButton size="small" aria-label="delete" onClick={() => onDelete(item.id)} title="删除" sx={{ p: 0.5 }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        }
        secondary={
          <Typography component="div" variant="body2">
            {hasContent && (
              <Box
                sx={{
                  px: { xs: 1.25, sm: 1.5 },
                  py: 0.75,
                  my: 0.5,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                }}
              >
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                  {item.content}
                </Typography>
              </Box>
            )}

            {imageList.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <ImageList 
                  variant="masonry" 
                  cols={imagePreviewCol} 
                  gap={6}
                  sx={{
                    // Prevent layout shift during loading
                    '& .MuiImageListItem-root': {
                      overflow: 'hidden',
                      borderRadius: 1,
                      '&:hover': {
                        transform: 'scale(1.02)',
                        transition: 'transform 0.2s ease-in-out'
                      }
                    }
                  }}
                >
                  {imageList.map(file =>
                    <ImageListItem key={file.id}>
                      <img
                        src={`/files/${file.file_path}`}
                        alt={file.file_name}
                        loading="lazy"
                        onClick={() => onImagePreview(`/files/${file.file_path}`, file.file_name)}
                        style={{ 
                          cursor: 'pointer',
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </ImageListItem>
                  )}
                </ImageList>
              </Box>
            )}

            {item.attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.25, fontSize: '0.78rem' }}>
                  附件 ({item.attachments.length})
                </Typography>
                <List component="div" dense sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1.25, p: 0 }}>
                  {item.attachments.map((file) => (
                    <ListItem
                      key={file.id}
                      component="div"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        py: 0.25,
                        minHeight: 32,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 22 }}>
                        {file.content_type.startsWith('image/') ?
                          <Image fontSize="small" /> :
                          <Attachment fontSize="small" />}
                      </ListItemIcon>
                      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {file.file_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            flexShrink: 0,
                            fontSize: '0.6875rem',
                          }}
                        >
                          {formatFileSize(file.file_size)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label="复制下载链接"
                        title="复制下载链接"
                        onClick={() => handleCopyAttachmentLink(file)}
                        sx={{ p: 0.5 }}
                      >
                        <LinkRounded fontSize="small" />
                      </IconButton>
                      <a
                        href={`/files/${file.file_path}`}
                        download={file.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', textDecoration: 'none' }}
                      >
                        <IconButton size="small" aria-label="下载附件" title="下载附件" sx={{ p: 0.5 }}>
                          <Download fontSize="small" />
                        </IconButton>
                      </a>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Typography>
        }
      />
    </ListItem>
  );
};

export default DataListItem;

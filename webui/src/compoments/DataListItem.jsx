import dayjs from 'dayjs';

// Format file size with appropriate unit
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DataListItem = ({
  item,
  expireSeconds,
  onFavorite,
  onDelete,
  onImagePreview
}) => {
  // Calculate TTL progress
  const calculateTTLProgress = (item) => {
    if (item.favorite || !expireSeconds || expireSeconds === 0) return null;

    const now = Math.floor(Date.now() / 1000);
    const expireTime = item.updated_at + expireSeconds;
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
  const dateString = dayjs.unix(item.created_at).format('YYYY-MM-DD HH:mm:ss');
  const ttlInfo = calculateTTLProgress(item);

  return (
    <ListItem
      alignItems="flex-start"
      sx={{ pb: 0 }}
    >
      <ListItemAvatar sx={{ display: { xs: 'none', sm: 'flex' } }}>
        <Avatar>
          {hasContent ? <TextSnippet /> : hasAttachments ? (imageList.length > 0 ? <Image /> : <Attachment />) : <Inbox />}
        </Avatar>
      </ListItemAvatar>

      <ListItemText
        sx={{
          pr: 2,
          ml: { xs: 0, sm: 0 }
        }}
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={ttlInfo ? `剩余时间: ${ttlInfo.timeLeft} (${Math.round(ttlInfo.progress)}%)` : '永不过期'} arrow>
                <Chip
                  label={dateString}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              </Tooltip>
            </Box>
            <Box>
              <IconButton size="small" aria-label="favorite" onClick={() => onFavorite(item.id)}>
                {item.favorite ? <Star color="warning" fontSize="small" /> : <StarBorder fontSize="small" />}
              </IconButton>
              <IconButton size="small" aria-label="delete" onClick={() => onDelete(item.id)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        }
        secondary={
          <Typography component="div" variant="body2">
            {hasContent && (
              <Paper
                variant="outlined"
                sx={{ p: 2, my: 1, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
              >
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </Typography>
              </Paper>
            )}

            {imageList.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <ImageList variant="quilted"
                  cols={useMediaQuery(theme => theme.breakpoints.up('md')) ? 3 : 2}
                  rowHeight={155}>
                  {imageList.map(file =>
                    <ImageListItem key={file.id}>
                      <img
                        src={`/files/${file.file_path}`}
                        alt={file.file_name}
                        loading="lazy"
                        onClick={() => onImagePreview(`/files/${file.file_path}`, file.file_name)}
                        style={{ cursor: 'pointer' }}
                      />
                    </ImageListItem>
                  )}
                </ImageList>
              </Box>
            )}

            {item.attachments.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  附件 ({item.attachments.length})
                </Typography>
                <List component="div" dense sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1, p: 0 }}>
                  {item.attachments.map((file) => (
                    <ListItem
                      key={file.id}
                      component="div"
                      sx={{ py: 0.5 }}
                      secondaryAction={
                        <a
                          href={`/files/${file.file_path}`}
                          download={file.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          <IconButton size="small" aria-label="download">
                            <Download fontSize="small" />
                          </IconButton>
                        </a>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {file.content_type.startsWith('image/') ?
                          <Image fontSize="small" /> :
                          <Attachment fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.file_name}
                        secondary={formatFileSize(file.file_size)}
                        primaryTypographyProps={{
                          noWrap: true,
                          variant: 'body2',
                          sx: { fontSize: '0.875rem' }
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: { fontSize: '0.75rem' }
                        }}
                        sx={{
                          pr: 1,
                          '& .MuiListItemText-primary': {
                            maxWidth: { xs: '150px', sm: '200px', md: '300px' }
                          }
                        }}
                      />
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
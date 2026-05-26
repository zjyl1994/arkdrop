import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AttachmentImage from './AttachmentImage';

const ImageGalleryView = ({ images, onImagePreview }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  
  // Responsive columns: xs: 2, sm: 3, md: 4, lg: 5, xl: 6
  const cols = isXs ? 2 : isSm ? 3 : isMd ? 4 : isLg ? 5 : 6;

  if (images.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 8,
          px: 2,
          mt: 4,
          backgroundColor: 'transparent'
        }}
      >
        <Image sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="text.primary" gutterBottom>
          暂无图片
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500 }}>
          当前没有任何图片附件。添加包含图片的内容后，这里将显示所有图片的预览。
        </Typography>
      </Paper>
    );
  }

  return (
    <ImageList 
      variant="masonry" 
      cols={cols} 
      gap={12}
      sx={{
        '& .MuiImageListItem-root': {
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: theme.shadows[2],
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8]
          }
        }
      }}
    >
      {images.map((image, index) => {
        const imageSrc = `/files/${image.file_path}`;

        return (
        <ImageListItem key={`${image.itemId}-${image.id}`}>
          <AttachmentImage
            src={imageSrc}
            alt={image.file_name}
            loading={index < cols * 2 ? 'eager' : 'lazy'}
            onClick={() => onImagePreview(imageSrc, image.file_name)}
          />
          <ImageListItemBar
            title={image.file_name}
            subtitle={dayjs.unix(image.itemCreatedAt).format('MM-DD HH:mm')}
            actionIcon={
              <IconButton
                sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onImagePreview(imageSrc, image.file_name);
                }}
              >
                <ZoomIn />
              </IconButton>
            }
            sx={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
              '& .MuiImageListItemBar-title': {
                fontSize: '0.875rem',
                fontWeight: 500
              },
              '& .MuiImageListItemBar-subtitle': {
                fontSize: '0.75rem',
                opacity: 0.8
              }
            }}
          />
        </ImageListItem>
        );
      })}
    </ImageList>
  );
};

export default ImageGalleryView;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
  outline: 'none',
  '& img': {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: theme.spacing(1),
    boxShadow: theme.shadows[24],
  },
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
}));

const ImagePreviewModal = ({ open, onClose, imageSrc, imageAlt }) => {
  const handleBackdropClick = (event) => {
    // Close modal when clicking on backdrop
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <StyledModal
      open={open}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby="image-preview-modal"
      aria-describedby="image-preview-description"
    >
      <ImageContainer>
        <img
          src={imageSrc}
          alt={imageAlt}
          loading="lazy"
        />
        <CloseButton
          onClick={onClose}
          aria-label="close"
          size="small"
        >
          <Close />
        </CloseButton>
      </ImageContainer>
    </StyledModal>
  );
};

export default ImagePreviewModal;
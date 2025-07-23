import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';

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

  const handleSubmit = async () => {
    if (!content && files.length === 0) {
      toast('请填写内容或选择文件');
      return;
    }

    const formData = new FormData();
    if (content) formData.append('content', content);
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await axios.post('/api/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      toast('提交成功: ' + JSON.stringify(response.data));

      // 清空表单
      setContent('');
      setFiles([]);
      setFileInputKey(Date.now());
      
      // 关闭Modal并通知父组件刷新列表
      handleClose();
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      toast('提交失败: ' + (error.response?.data?.message || error.message));
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
          />
        </Box>
        <ButtonGroup variant="contained">
          <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
          >
            {files.length > 0 ? `已选择 ${files.length} 个文件` : "上传文件"}
            <VisuallyHiddenInput
              type="file"
              onChange={(e) => setFiles(Array.from(e.target.files))}
              key={fileInputKey}
              multiple
            />
          </Button>
          <Button onClick={handleSubmit}>发送</Button>
          <Button onClick={handleClose}>取消</Button>
        </ButtonGroup>
      </Box>
    </Modal>
  );
};

export default CreatePostModal;
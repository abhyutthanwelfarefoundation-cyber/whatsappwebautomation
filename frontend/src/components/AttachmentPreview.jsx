import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Typography from '@mui/material/Typography';
import { fetchAttachmentBlobUrl } from '../api/whatsapp';

export default function AttachmentPreview({ attachmentId, fileName, mimeType }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    let objectUrl;
    (async () => {
      try {
        objectUrl = await fetchAttachmentBlobUrl(attachmentId);
        setBlobUrl(objectUrl);
      } catch {
        setBlobUrl(null);
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);

  const isImage = mimeType?.startsWith('image/');

  if (isImage) {
    return blobUrl ? (
      <Box
        component="img"
        src={blobUrl}
        alt={fileName}
        sx={{ maxWidth: 240, maxHeight: 240, borderRadius: 1, display: 'block', mt: 0.5 }}
      />
    ) : (
      <Typography variant="caption" color="text.secondary">Loading image…</Typography>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
      <InsertDriveFileIcon fontSize="small" />
      {blobUrl ? (
        <Link href={blobUrl} download={fileName} variant="body2">
          {fileName}
        </Link>
      ) : (
        <Typography variant="body2">{fileName}</Typography>
      )}
    </Box>
  );
}

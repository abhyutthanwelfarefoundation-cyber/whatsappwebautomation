import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import AppLayout from '../components/AppLayout';
import AttachmentPreview from '../components/AttachmentPreview';
import { listConversations, getThread, markRead, sendMessage, uploadAttachment, deleteMessage, retryMessage } from '../api/whatsapp';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

function StatusIcon({ status }) {
  if (status === 'Read') return <DoneAllIcon fontSize="inherit" sx={{ color: '#53bdeb' }} />;
  if (status === 'Delivered') return <DoneAllIcon fontSize="inherit" />;
  if (status === 'Sent') return <DoneIcon fontSize="inherit" />;
  if (status === 'Failed') return <ErrorOutlineIcon fontSize="inherit" color="error" />;
  return null;
}

export default function WhatsApp() {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuMessage, setMenuMessage] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const canSend = hasPermission('whatsapp.send');

  const loadConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const data = await listConversations({ search });
      setConversations(data.rows);
    } finally {
      setLoadingConvos(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadConversations, 300);
    return () => clearTimeout(t);
  }, [loadConversations]);

  const openConversation = async (customerId) => {
    setSelectedCustomer(customerId);
    setLoadingThread(true);
    setError('');
    try {
      const data = await getThread(customerId);
      setMessages(data.messages);
      await markRead(customerId);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversation');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const paramCustomerId = searchParams.get('customerId');
    if (paramCustomerId) {
      openConversation(Number(paramCustomerId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.CustomerId === selectedCustomer) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConversations();
    };

    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) => prev.map((m) => (m.MessageId === messageId ? { ...m, Status: status } : m)));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.MessageId !== messageId));
      loadConversations();
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatusUpdate);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('conversation:updated', loadConversations);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatusUpdate);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('conversation:updated', loadConversations);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const handleSendText = async () => {
    if (!draft.trim() || !selectedCustomer) return;
    setSending(true);
    setError('');
    try {
      await sendMessage({ customerId: selectedCustomer, content: draft.trim() });
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedCustomer) return;
    setSending(true);
    setError('');
    try {
      const attachment = await uploadAttachment(file, {
        fileType: file.type === 'application/pdf' ? 'PDF' : file.type.startsWith('image/') ? 'Image' : 'Document',
      });
      await sendMessage({ customerId: selectedCustomer, attachmentId: attachment.AttachmentId });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send attachment');
    } finally {
      setSending(false);
    }
  };

  const openMessageMenu = (e, message) => {
    setMenuAnchor(e.currentTarget);
    setMenuMessage(message);
  };

  const closeMessageMenu = () => {
    setMenuAnchor(null);
    setMenuMessage(null);
  };

  const handleDeleteMessage = async () => {
    const message = menuMessage;
    closeMessageMenu();
    if (!message) return;
    try {
      await deleteMessage(message.MessageId);
      setMessages((prev) => prev.filter((m) => m.MessageId !== message.MessageId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleRetryMessage = async () => {
    const message = menuMessage;
    closeMessageMenu();
    if (!message) return;
    setError('');
    try {
      const updated = await retryMessage(message.MessageId);
      setMessages((prev) => prev.map((m) => (m.MessageId === updated.MessageId ? { ...m, Status: updated.Status } : m)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend message');
    }
  };

  const selectedConvo = conversations.find((c) => c.CustomerId === selectedCustomer);

  return (
    <AppLayout>
      <Typography variant="h5" fontWeight={700} mb={2}>
        WhatsApp
      </Typography>

      <Paper sx={{ display: 'flex', height: '70vh', overflow: 'hidden' }}>
        {/* Conversation list */}
        <Box sx={{ width: 320, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box p={1.5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loadingConvos ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={20} />
              </Box>
            ) : conversations.length === 0 ? (
              <Typography variant="body2" color="text.secondary" p={2}>
                No conversations yet. Sending a message from a Customer page starts one.
              </Typography>
            ) : (
              <List disablePadding>
                {conversations.map((c) => (
                  <ListItemButton
                    key={c.CustomerId}
                    selected={c.CustomerId === selectedCustomer}
                    onClick={() => openConversation(c.CustomerId)}
                  >
                    <Avatar sx={{ mr: 1.5, bgcolor: 'secondary.main' }}>{c.Name?.[0]?.toUpperCase()}</Avatar>
                    <ListItemText
                      primary={c.Name}
                      secondary={
                        c.LastMessageType === 'Text'
                          ? c.LastMessageContent
                          : `📎 ${c.LastMessageType}`
                      }
                      secondaryTypographyProps={{ noWrap: true, sx: { maxWidth: 180 } }}
                    />
                    {c.UnreadCount > 0 && (
                      <Badge badgeContent={c.UnreadCount} color="secondary" sx={{ mr: 1 }} />
                    )}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Thread */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedCustomer ? (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Typography color="text.secondary">Select a conversation to view messages</Typography>
            </Box>
          ) : (
            <>
              <Box p={1.5} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedConvo?.Name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedConvo?.Mobile}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#efeae2' }}>
                {loadingThread ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={20} />
                  </Box>
                ) : (
                  messages.map((m) => (
                    <Box
                      key={m.MessageId}
                      className="message-row"
                      sx={{
                        display: 'flex',
                        justifyContent: m.Direction === 'Outgoing' ? 'flex-end' : 'flex-start',
                        mb: 1,
                        '&:hover .msg-menu-btn': { opacity: 1 },
                      }}
                    >
                      {m.Direction === 'Outgoing' && canSend && (
                        <IconButton
                          size="small"
                          className="msg-menu-btn"
                          sx={{ opacity: 0, transition: 'opacity 0.15s', alignSelf: 'center', mr: 0.5 }}
                          onClick={(e) => openMessageMenu(e, m)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Box
                        sx={{
                          maxWidth: '65%',
                          bgcolor: m.Direction === 'Outgoing' ? '#d9fdd3' : 'white',
                          borderRadius: 2,
                          p: 1.2,
                          boxShadow: 1,
                        }}
                      >
                        {m.AttachmentId && (
                          <AttachmentPreview
                            attachmentId={m.AttachmentId}
                            fileName={m.FileName}
                            mimeType={m.MimeType}
                          />
                        )}
                        {m.Content && <Typography variant="body2">{m.Content}</Typography>}
                        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5} mt={0.3}>
                          {m.Status === 'Failed' && m.FailReason && (
                            <Typography variant="caption" color="error" sx={{ mr: 0.5 }}>
                              {m.FailReason}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(m.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                          {m.Direction === 'Outgoing' && <StatusIcon status={m.Status} />}
                        </Box>
                      </Box>
                    </Box>
                  ))
                )}
                <div ref={bottomRef} />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mx: 1.5, mb: 1 }} onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {canSend ? (
                <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileSelected} />
                  <IconButton onClick={() => fileInputRef.current?.click()} disabled={sending}>
                    <AttachFileIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendText();
                      }
                    }}
                    disabled={sending}
                  />
                  <IconButton color="primary" onClick={handleSendText} disabled={sending || !draft.trim()}>
                    <SendIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box p={1.5}>
                  <Chip label="You don't have permission to send messages" size="small" />
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMessageMenu}>
        {menuMessage?.Status === 'Failed' && (
          <MenuItem onClick={handleRetryMessage}>
            <ListItemIcon>
              <ReplayIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Retry send</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteMessage}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete for me</ListItemText>
        </MenuItem>
      </Menu>
    </AppLayout>
  );
}
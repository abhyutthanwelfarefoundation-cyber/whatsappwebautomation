import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import CancelIcon from '@mui/icons-material/Cancel';
import AppLayout from '../components/AppLayout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachmentPreview from '../components/AttachmentPreview';
import { listConversations, getThread, markRead, sendMessage, uploadAttachment, deleteMessage, retryMessage } from '../api/whatsapp';
import { scheduleMessage, listScheduledMessages, cancelScheduledMessage } from '../api/scheduledMessages';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';






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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledListOpen, setScheduledListOpen] = useState(false);
  const [scheduledList, setScheduledList] = useState([]);
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
  const handleScheduleSubmit = async () => {
    if (!draft.trim() || !scheduleDateTime || !selectedCustomer) return;
    setScheduling(true);
    setError('');
    try {
      await scheduleMessage({
        customerId: selectedCustomer,
        messageType: 'Text',
        content: draft.trim(),
        scheduledFor: new Date(scheduleDateTime).toISOString(),
      });
      setDraft('');
      setScheduleDialogOpen(false);
      setScheduleDateTime('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule message');
    } finally {
      setScheduling(false);
    }
  };

  const openScheduledList = async () => {
    setScheduledListOpen(true);
    try {
      const list = await listScheduledMessages(selectedCustomer);
      setScheduledList(list);
    } catch {
      setScheduledList([]);
    }
  };

  const handleCancelScheduled = async (id) => {
    try {
      await cancelScheduledMessage(id);
      setScheduledList((prev) => prev.filter((s) => s.ScheduledMessageId !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel scheduled message');
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
        <Box sx={{ flex: 1, display: selectedCustomer ? 'flex' : { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
          {!selectedCustomer ? (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Typography color="text.secondary">Select a conversation to view messages</Typography>
            </Box>
          ) : (
            <>
             <Box p={1.5} sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton size="small" onClick={() => setSelectedCustomer(null)} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
      <ArrowBackIcon fontSize="small" />
    </IconButton>
          
      <Typography variant="subtitle1" fontWeight={600}>
        {selectedConvo?.Name}
      </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedConvo?.Mobile}
                  </Typography>
                </Box>
                {canSend && (
                  <Button size="small" startIcon={<ScheduleSendIcon />} onClick={openScheduledList}>
                    Scheduled
                  </Button>
                )}
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
                  <IconButton
                    onClick={() => setScheduleDialogOpen(true)}
                    disabled={sending || !draft.trim()}
                    title="Schedule for later"
                  >
                    <ScheduleSendIcon />
                  </IconButton>
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

      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Schedule message</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            "{draft}"
          </Typography>
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            value={scheduleDateTime}
            onChange={(e) => setScheduleDateTime(e.target.value)}
            inputProps={{ min: new Date(Date.now() + 60000).toISOString().slice(0, 16) }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScheduleSubmit} disabled={!scheduleDateTime || scheduling}>
            {scheduling ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={scheduledListOpen} onClose={() => setScheduledListOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Scheduled messages</DialogTitle>
        <DialogContent>
          {scheduledList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nothing scheduled for this conversation.</Typography>
          ) : (
            scheduledList.map((s) => (
              <Box key={s.ScheduledMessageId} display="flex" justifyContent="space-between" alignItems="center" py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2">{s.Content || `[${s.MessageType}]`}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(s.ScheduledFor).toLocaleString()} · by {s.CreatedByName}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => handleCancelScheduled(s.ScheduledMessageId)}>
                  <CancelIcon fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduledListOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
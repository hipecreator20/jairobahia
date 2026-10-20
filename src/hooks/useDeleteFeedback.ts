import { useRef, useState } from 'react';

export function useDeleteFeedback() {
  const pending = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const removeItem = async (label: string, action: () => Promise<void>) => {
    if (pending.current || !window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
    pending.current = true; setDeleting(true); setDeleteMessage('Excluindo…');
    try {
      await action();
      setDeleteMessage(`${label}: exclusão confirmada.`);
    } catch {
      setDeleteMessage('Não foi possível excluir. Confira sua conexão e se sua conta está aprovada antes de tentar novamente.');
    } finally {
      pending.current = false; setDeleting(false);
    }
  };
  return { deleting, deleteMessage, removeItem };
}

export function validateDispatchQuantity(requested, totalStock) {
  if (typeof requested !== 'number' || typeof totalStock !== 'number') {
    return { valid: false, message: 'Quantity and stock must be numbers.' };
  }
  if (requested <= 0) {
    return { valid: false, message: 'Quantity must be greater than zero.' };
  }
  if (requested > totalStock) {
    return { valid: false, message: 'Insufficient stock in warehouse.' };
  }
  return { valid: true, message: 'Quantity is valid.' };
}

export function getStatusBadgeColor(status) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'in_transit':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'delivered':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'cancelled':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

export function formatDispatchOrderNotes(notes) {
  if (!notes || notes.trim() === '') {
    return 'No notes provided.';
  }
  return notes.trim();
}

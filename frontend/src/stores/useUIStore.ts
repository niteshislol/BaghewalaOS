import { useCallback, useState } from 'react';

export const useUIStore = () => {
  const [createWorkOrderModalOpen, setCreateWorkOrderModalOpen] = useState(false);
  const close = useCallback((open: boolean) => setCreateWorkOrderModalOpen(open), []);
  return { createWorkOrderModalOpen, setCreateWorkOrderModalOpen: close };
};

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editAdmin } from '@/app/actions/admin-users';

interface EditAdminModalProps {
  admin: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedAdmin: any) => void;
}

export function EditAdminModal({ admin, open, onOpenChange, onSuccess }: EditAdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const res = await editAdmin(admin.id, formData);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      // Create updated object for optimistic UI
      const updatedAdmin = {
        ...admin,
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      };
      onSuccess(updatedAdmin);
      onOpenChange(false);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update contact information for {admin.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive font-medium">{error}</div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={admin.full_name}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={admin.email}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={admin.phone || ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">New Password (Optional)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current"
              />
              <p className="text-[10px] text-muted-foreground">Only fill this to override their password.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

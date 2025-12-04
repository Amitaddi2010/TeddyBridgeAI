import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, X } from "lucide-react";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutConfirmationDialog({ open, onOpenChange, onConfirm }: LogoutConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-destructive" />
            Confirm Logout
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <LogOut className="w-4 h-4 mr-2" />
            Yes, Log Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


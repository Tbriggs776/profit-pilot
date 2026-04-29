import React, { useState } from 'react';
import { Settings, Trash2, User, Mail, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export default function AccountSettings() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteAccount = () => {
    // In a real app, this would call an API to delete the account
    console.log('Account deletion confirmed');
    setShowDeleteDialog(false);
    setIsOpen(false);
    // You could add actual deletion logic here with base44 SDK
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400 select-none" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 select-none" />
              Account Settings
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Manage your account preferences and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Account Info Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 select-none">
                <User className="h-4 w-4 select-none" />
                Account Information
              </h3>
              <div className="pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p className="select-none">Manage your profile and preferences</p>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Privacy Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 select-none">
                <Shield className="h-4 w-4 select-none" />
                Privacy & Security
              </h3>
              <div className="pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p className="select-none">Your data is protected and secure</p>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Danger Zone */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 select-none">
                <Trash2 className="h-4 w-4 select-none" />
                Danger Zone
              </h3>
              <div className="pl-6">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full justify-start bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  <Trash2 className="h-4 w-4 mr-2 select-none" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
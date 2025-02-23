
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ServerImageUpload } from "./ServerImageUpload";
import type { ServerSettingsProps } from "./types";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ServerOverviewTab = ({ server }: ServerSettingsProps) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isOwner = currentUser?.id === server.owner_id;
  
  // Local state for form values
  const [formData, setFormData] = useState({
    name: server.name,
    description: server.description || '',
    allow_invites: server.allow_invites,
    require_approval: server.require_approval
  });

  const updateServerSettings = useMutation({
    mutationFn: async (updates: Partial<typeof server>) => {
      const { data, error } = await supabase
        .from('servers')
        .update(updates)
        .eq('id', server.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', server.id] });
      queryClient.invalidateQueries({ queryKey: ['user-servers'] });
      toast.success("Server settings updated successfully");
    },
    onError: (error) => {
      console.error('Error updating server settings:', error);
      toast.error("Failed to update server settings");
    }
  });

  const deleteServer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', server.id);

      if (error) {
        console.error('Error deleting server:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success("Server deleted successfully");
      navigate('/servers');
    },
    onError: (error) => {
      console.error('Error deleting server:', error);
      toast.error("Failed to delete server");
    }
  });

  const handleSettingToggle = (setting: keyof typeof formData) => {
    if (!isOwner) {
      toast.error("Only the server owner can modify settings");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof formData]
    }));
  };

  const handleSave = () => {
    if (!isOwner) {
      toast.error("Only the server owner can modify settings");
      return;
    }

    updateServerSettings.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Server Overview</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Server Name</Label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={!isOwner || updateServerSettings.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            disabled={!isOwner || updateServerSettings.isPending}
            placeholder="Describe your server..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Server Icon</Label>
            <ServerImageUpload
              server={server}
              type="icon"
              currentUrl={server.icon_url}
              onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['server', server.id] })}
              isOwner={isOwner}
            />
          </div>

          <div className="space-y-2">
            <Label>Server Banner</Label>
            <ServerImageUpload
              server={server}
              type="banner"
              currentUrl={server.banner_url}
              onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['server', server.id] })}
              isOwner={isOwner}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Invites</Label>
              <p className="text-sm text-muted-foreground">
                Allow members to create invite links
              </p>
            </div>
            <Switch
              checked={formData.allow_invites}
              onCheckedChange={() => handleSettingToggle('allow_invites')}
              disabled={!isOwner || updateServerSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval</Label>
              <p className="text-sm text-muted-foreground">
                Require owner approval for new members
              </p>
            </div>
            <Switch
              checked={formData.require_approval}
              onCheckedChange={() => handleSettingToggle('require_approval')}
              disabled={!isOwner || updateServerSettings.isPending}
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Server
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      server and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteServer.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteServer.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        "Delete Server"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button 
              onClick={handleSave}
              disabled={!isOwner || updateServerSettings.isPending}
              className="ml-auto"
            >
              {updateServerSettings.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


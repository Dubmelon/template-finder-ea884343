
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { CreateServerForm } from "@/components/servers/CreateServerForm";
import { ServerList } from "@/components/servers/ServerList";
import { supabase } from "@/integrations/supabase/client";
import { Server } from "@/components/dashboard/types";
import { useState } from "react";

const Servers = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      return user;
    },
  });

  const { data: servers, isLoading, error: serversError } = useQuery({
    queryKey: ['servers', searchQuery],
    queryFn: async () => {
      if (!currentUser) return [];

      const query = supabase
        .from('servers')
        .select(`
          id,
          name,
          description,
          created_at,
          icon_url,
          banner_url,
          owner_id,
          updated_at,
          is_private,
          member_count,
          is_member:server_members!inner(user_id)
        `)
        .order('name');

      // If there's a search query, filter by name or description
      if (searchQuery) {
        query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data.map(server => ({
        ...server,
        is_member: true // Since we're using an inner join, all returned servers are ones the user is a member of
      })) as Server[];
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60,
    retry: 1,
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
      return;
    }
    navigate("/");
    toast.success("Signed out successfully");
  };

  if (serversError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-500">Error loading servers</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto max-w-3xl p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <Button variant="ghost" onClick={handleSignOut} className="hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {currentUser && (
          <>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <CreateServerForm currentUserId={currentUser.id} />
            </div>

            <ServerList 
              servers={servers || []} 
              currentUserId={currentUser.id} 
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Servers;

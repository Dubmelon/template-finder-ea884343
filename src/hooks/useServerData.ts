
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServerData {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  owner: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  member_count: number;
  created_at: string;
  updated_at: string;
}

export const useServerData = (serverId: string | undefined) => {
  return useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      console.log(`[ServerView] Fetching server details for ID: ${serverId}`);
      const startTime = performance.now();

      const { data: server, error } = await supabase
        .from('servers')
        .select(`
          id,
          name,
          description,
          icon_url,
          banner_url,
          member_count,
          created_at,
          updated_at,
          owner:owner_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', serverId)
        .single();

      if (error) {
        console.error('[ServerView] Error fetching server:', error);
        throw error;
      }

      if (!server) {
        throw new Error("Server not found");
      }

      const endTime = performance.now();
      console.log(`[ServerView] Server fetch completed in ${(endTime - startTime).toFixed(2)}ms:`, server);
      
      return server as ServerData;
    },
    enabled: !!serverId,
    staleTime: 30000,
    meta: {
      errorMessage: "Failed to load server details"
    }
  });
};


import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ChannelCategory } from "./channel/ChannelCategory";
import { UserControls } from "./channel/UserControls";
import { useCreateChannel, useCreateFolder } from "./channel/mutations";
import type { Channel } from "@/types/database";
import type { ChannelListProps, CategoryState, ChannelCategory as ChannelCategoryType } from "./channel/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ChannelList = ({ serverId, channels, selectedChannel, onSelectChannel }: ChannelListProps) => {
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newChannelType, setNewChannelType] = useState<Channel['type']>('text');
  const [newChannelCategory, setNewChannelCategory] = useState<ChannelCategoryType>("general");
  const [expandedCategories, setExpandedCategories] = useState<CategoryState>({ general: true });
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createChannel = useCreateChannel(serverId, () => {
    queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    setIsCreatingChannel(false);
    setNewChannelName("");
    setNewChannelCategory("general");
  });

  const createFolder = useCreateFolder(serverId, currentUser?.id, () => {
    queryClient.invalidateQueries({ queryKey: ['server-folders', currentUser?.id] });
    setIsCreatingFolder(false);
    setNewFolderName("");
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !channels) {
      return;
    }

    const activeChannel = channels.find(c => c.id === active.id);
    const overChannel = channels.find(c => c.id === over.id);
    
    if (!activeChannel || !overChannel) return;

    try {
      const { error } = await supabase
        .from('channels')
        .update({ 
          position: overChannel.position,
          parent_id: overChannel.parent_id 
        })
        .eq('id', activeChannel.id);

      if (error) throw error;

      // Update local cache
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      toast.success("Channel position updated");
    } catch (error) {
      console.error('[ChannelList] Error updating channel position:', error);
      toast.error("Failed to update channel position");
    }
  };

  // Organize channels into a hierarchy
  const organizeChannels = (channels: Channel[]) => {
    const rootChannels = channels.filter(c => !c.parent_id);
    const childChannels = channels.filter(c => c.parent_id);
    
    const channelMap = new Map<string, Channel[]>();
    
    rootChannels.forEach(channel => {
      const children = childChannels.filter(c => c.parent_id === channel.id);
      if (children.length > 0) {
        channelMap.set(channel.id, children);
      }
    });

    return { rootChannels, channelMap };
  };

  const { rootChannels, channelMap } = organizeChannels(channels || []);

  const channelsByCategory = rootChannels.reduce((acc, channel) => {
    const category = channel.category ?? 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(channel);
    return acc;
  }, {} as Record<ChannelCategoryType, Channel[]>);

  return (
    <div className="flex flex-col h-full bg-muted/50 backdrop-blur-xl">
      <div className="overflow-y-auto flex-1">
        <div className="p-2 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={channels?.map(channel => channel.id) || []}
              strategy={verticalListSortingStrategy}
            >
              {Object.entries(channelsByCategory).map(([category, categoryChannels]) => (
                <ChannelCategory
                  key={category}
                  category={category}
                  channels={categoryChannels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={onSelectChannel}
                  isExpanded={expandedCategories[category]}
                  onToggle={() => toggleCategory(category)}
                  childChannels={channelMap}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <UserControls serverId={serverId} currentUser={currentUser} />
    </div>
  );
};

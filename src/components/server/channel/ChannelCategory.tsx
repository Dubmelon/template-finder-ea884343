import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Hash, Volume2, MessageSquare, Megaphone } from "lucide-react";
import type { Channel } from "@/types/database";
import type { CategoryProps } from "./types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableChannelProps {
  channel: Channel;
  selected: boolean;
  onClick: () => void;
  serverId: string;
  depth?: number;
  isAdmin?: boolean;
}

const SortableChannel = ({ channel, selected, onClick, serverId, depth = 0, isAdmin }: SortableChannelProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${depth * 1.5}rem`,
  };

  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'text':
        return <Hash className="h-4 w-4 shrink-0" />;
      case 'voice':
        return <Volume2 className="h-4 w-4 shrink-0" />;
      case 'forum':
        return <MessageSquare className="h-4 w-4 shrink-0" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 shrink-0" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group w-full p-1.5 flex items-center space-x-2 rounded-lg transition-all",
        selected 
          ? 'bg-accent text-accent-foreground' 
          : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
      )}
    >
      <div {...listeners} className="cursor-grab opacity-0 group-hover:opacity-100">
        <ChevronRight className="h-4 w-4" />
      </div>
      <button
        onClick={onClick}
        className="flex-1 flex items-center space-x-2"
      >
        {getChannelIcon(channel.type)}
        <span className="truncate text-sm">{channel.name}</span>
      </button>
    </div>
  );
};

export const ChannelCategory = ({ 
  category, 
  channels, 
  selectedChannel, 
  onSelectChannel, 
  isExpanded, 
  onToggle,
  childChannels,
  isAdmin
}: CategoryProps) => {
  const renderChannel = (channel: Channel, depth = 0) => {
    const children = childChannels?.get(channel.id) || [];
    
    return (
      <div key={channel.id}>
        <SortableChannel
          channel={channel}
          selected={selectedChannel === channel.id}
          onClick={() => onSelectChannel(channel.id)}
          serverId={channel.server_id}
          depth={depth}
          isAdmin={isAdmin}
        />
        {children.map(child => renderChannel(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-2 py-1 w-full hover:bg-accent/50 rounded-md transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {category}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 space-y-0.5 overflow-hidden"
          >
            {channels.map(channel => renderChannel(channel))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

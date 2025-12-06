import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Pin,
  Image as ImageIcon,
  Video,
  Music,
  Link as LinkIcon,
  Calendar,
  SortAsc,
  Clock,
  Hash,
} from 'lucide-react';

interface Note {
  id: string;
  courseId?: string;
  platformId?: string;
  title: string;
  content: string;
  resourceUrl?: string;
  tags?: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    title: string;
  };
  platform?: {
    name: string;
  };
}

interface LibraryTreeNavProps {
  notes: Note[];
  selectedNodeId: string | null;
  selectedMaterialId?: string | null;
  onSelectNode: (nodeId: string, type: string) => void;
  onSelectMaterial?: (note: Note) => void;
}

type SortType = 'all' | 'type' | 'name' | 'date' | 'tags';

export function LibraryTreeNav({ notes, selectedNodeId, onSelectNode, onSelectMaterial }: LibraryTreeNavProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['all']));
  const [activeSort, setActiveSort] = useState<SortType>('all');

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getFileType = (url: string | undefined): string => {
    if (!url) return 'text';
    if (url.startsWith('data:image/') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
      return 'image';
    }
    if (url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'video';
    }
    if (url.startsWith('data:audio/') || url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg')) {
      return 'audio';
    }
    if (url.startsWith('http')) {
      return 'link';
    }
    return 'text';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      case 'video': return <Video className="h-4 w-4 text-red-500" />;
      case 'audio': return <Music className="h-4 w-4 text-purple-500" />;
      case 'link': return <LinkIcon className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const pinnedNotes = notes.filter(n => n.isPinned);

  const groupByType = () => {
    const groups: Record<string, Note[]> = {
      image: [],
      video: [],
      audio: [],
      link: [],
      text: [],
    };
    notes.forEach(note => {
      const type = getFileType(note.resourceUrl);
      groups[type].push(note);
    });
    return groups;
  };

  const sortByName = () => {
    return [...notes].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  };

  const groupByDate = () => {
    const today = new Date();
    const groups: Record<string, Note[]> = {
      'Сегодня': [],
      'Вчера': [],
      'Эта неделя': [],
      'Этот месяц': [],
      'Ранее': [],
    };
    
    notes.forEach(note => {
      const date = new Date(note.createdAt);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) groups['Сегодня'].push(note);
      else if (diffDays === 1) groups['Вчера'].push(note);
      else if (diffDays <= 7) groups['Эта неделя'].push(note);
      else if (diffDays <= 30) groups['Этот месяц'].push(note);
      else groups['Ранее'].push(note);
    });
    
    return groups;
  };

  const groupByTags = () => {
    const groups: Record<string, Note[]> = {};
    const noTags: Note[] = [];
    
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(note);
        });
      } else {
        noTags.push(note);
      }
    });
    
    if (noTags.length > 0) {
      groups['Без тегов'] = noTags;
    }
    
    return groups;
  };

  const typeLabels: Record<string, string> = {
    image: 'Изображения',
    video: 'Видео',
    audio: 'Аудио',
    link: 'Ссылки',
    text: 'Заметки',
  };

  const sortButtons = [
    { id: 'all' as SortType, label: 'Все', icon: <FileText className="h-3 w-3" /> },
    { id: 'type' as SortType, label: 'По типу', icon: <ImageIcon className="h-3 w-3" /> },
    { id: 'name' as SortType, label: 'По имени', icon: <SortAsc className="h-3 w-3" /> },
    { id: 'date' as SortType, label: 'По дате', icon: <Calendar className="h-3 w-3" /> },
    { id: 'tags' as SortType, label: 'По тегам', icon: <Hash className="h-3 w-3" /> },
  ];

  const renderMaterialItem = (note: Note, level: number = 1) => {
    const isSelected = selectedNodeId === `material-${note.id}`;
    return (
      <Button
        key={note.id}
        variant={isSelected ? 'default' : 'ghost'}
        size="sm"
        className="w-full justify-start text-left h-7 mb-0.5"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onSelectNode(`material-${note.id}`, 'material');
          if (onSelectMaterial) onSelectMaterial(note);
        }}
      >
        {getTypeIcon(getFileType(note.resourceUrl))}
        <span className="flex-1 truncate ml-2 text-xs">{note.title}</span>
        {note.isPinned && <Pin className="h-3 w-3 text-yellow-500 ml-1" />}
      </Button>
    );
  };

  const renderGroup = (groupId: string, label: string, items: Note[], icon: React.ReactNode, level: number = 0) => {
    if (items.length === 0) return null;
    
    const isExpanded = expandedNodes.has(groupId);
    const isSelected = selectedNodeId === groupId;
    
    return (
      <div key={groupId}>
        <Button
          variant={isSelected ? 'default' : 'ghost'}
          size="sm"
          className="w-full justify-start text-left h-7 mb-0.5"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            onSelectNode(groupId, 'group');
            toggleNode(groupId);
          }}
        >
          <span className="mr-1">
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          {icon}
          <span className="flex-1 truncate ml-1 text-xs">{label}</span>
          <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
            {items.length}
          </Badge>
        </Button>
        {isExpanded && (
          <div>
            {items.map(note => renderMaterialItem(note, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSort) {
      case 'type': {
        const groups = groupByType();
        return Object.entries(groups).map(([type, items]) => 
          renderGroup(`type-${type}`, typeLabels[type] || type, items, getTypeIcon(type))
        );
      }
      case 'name': {
        const sorted = sortByName();
        return sorted.map(note => renderMaterialItem(note, 0));
      }
      case 'date': {
        const groups = groupByDate();
        return Object.entries(groups).map(([period, items]) => 
          renderGroup(`date-${period}`, period, items, <Clock className="h-4 w-4 text-orange-500" />)
        );
      }
      case 'tags': {
        const groups = groupByTags();
        return Object.entries(groups).map(([tag, items]) => 
          renderGroup(`tag-${tag}`, tag === 'Без тегов' ? tag : `#${tag}`, items, <Hash className="h-4 w-4 text-green-500" />)
        );
      }
      default: {
        return notes.map(note => renderMaterialItem(note, 0));
      }
    }
  };

  return (
    <Card className="h-full flex flex-col border-r">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm">Навигация</CardTitle>
        <div className="flex flex-wrap gap-1 mt-2">
          {sortButtons.map(btn => (
            <Button
              key={btn.id}
              variant={activeSort === btn.id ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setActiveSort(btn.id);
                if (btn.id === 'type') {
                  setExpandedNodes(new Set(['type-image', 'type-video', 'type-audio', 'type-link', 'type-text']));
                } else if (btn.id === 'date') {
                  setExpandedNodes(new Set(['date-Сегодня', 'date-Вчера', 'date-Эта неделя', 'date-Этот месяц', 'date-Ранее']));
                } else if (btn.id === 'tags') {
                  const tags = [...new Set(notes.flatMap(n => n.tags || []))];
                  setExpandedNodes(new Set([...tags.map(t => `tag-${t}`), 'tag-Без тегов']));
                } else {
                  setExpandedNodes(new Set(['all']));
                }
              }}
            >
              {btn.icon}
              <span className="ml-1 hidden sm:inline">{btn.label}</span>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {pinnedNotes.length > 0 && (
          <>
            {renderGroup('pinned', 'Закреплённые', pinnedNotes, <Pin className="h-4 w-4 text-yellow-500" />)}
            <div className="border-b my-2" />
          </>
        )}
        {renderContent()}
      </CardContent>
    </Card>
  );
}

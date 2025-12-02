import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Pin,
  Zap,
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

interface TreeNode {
  id: string;
  label: string;
  type: 'pinned' | 'platform' | 'course' | 'tag' | 'uncategorized' | 'material';
  count?: number;
  children?: TreeNode[];
  parentId?: string;
}

interface LibraryTreeNavProps {
  notes: Note[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string, type: string) => void;
}

export function LibraryTreeNav({ notes, selectedNodeId, onSelectNode }: LibraryTreeNavProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['platforms', 'courses', 'tags'])
  );

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Группируем материалы
  const pinnedNotes = notes.filter(n => n.isPinned);
  const platformsMap = new Map<string, Note[]>();
  const coursesMap = new Map<string, Note[]>();
  const tagsMap = new Map<string, Note[]>();
  let uncategorizedCount = 0;

  notes.forEach(note => {
    if (note.platformId) {
      if (!platformsMap.has(note.platformId)) {
        platformsMap.set(note.platformId, []);
      }
      platformsMap.get(note.platformId)!.push(note);
    } else if (!note.courseId && (!note.tags || note.tags.length === 0)) {
      uncategorizedCount++;
    }

    if (note.courseId) {
      if (!coursesMap.has(note.courseId)) {
        coursesMap.set(note.courseId, []);
      }
      coursesMap.get(note.courseId)!.push(note);
    }

    if (note.tags) {
      note.tags.forEach(tag => {
        if (!tagsMap.has(tag)) {
          tagsMap.set(tag, []);
        }
        tagsMap.get(tag)!.push(note);
      });
    }
  });

  const renderTreeNode = (
    node: TreeNode,
    level: number = 0
  ) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id}>
        <Button
          variant={isSelected ? 'default' : 'ghost'}
          size="sm"
          className="w-full justify-start text-left h-8 mb-1"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            onSelectNode(node.id, node.type);
            if (hasChildren) {
              toggleNode(node.id);
            }
          }}
        >
          {hasChildren && (
            <span className="mr-1" onClick={(e) => {
              e.stopPropagation();
              toggleNode(node.id);
            }}>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4 mr-1" />}

          {node.type === 'pinned' && <Pin className="h-4 w-4 mr-2 text-yellow-500" />}
          {node.type === 'platform' && <Zap className="h-4 w-4 mr-2 text-blue-500" />}
          {node.type === 'course' && <Folder className="h-4 w-4 mr-2 text-purple-500" />}
          {node.type === 'tag' && <FileText className="h-4 w-4 mr-2 text-green-500" />}
          {node.type === 'uncategorized' && <FileText className="h-4 w-4 mr-2 text-gray-500" />}

          <span className="flex-1 truncate">{node.label}</span>
          {node.count !== undefined && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {node.count}
            </Badge>
          )}
        </Button>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col border-r">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Навигация</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-1">
        {/* Закреплённые */}
        {pinnedNotes.length > 0 && renderTreeNode({
          id: 'pinned',
          label: 'Закреплённые',
          type: 'pinned',
          count: pinnedNotes.length,
          children: pinnedNotes.map(note => ({
            id: `material-${note.id}`,
            label: note.title,
            type: 'material',
            parentId: 'pinned',
          })),
        })}

        {/* Платформы */}
        {platformsMap.size > 0 && renderTreeNode({
          id: 'platforms',
          label: 'Платформы',
          type: 'platform',
          count: Array.from(platformsMap.values()).flat().length,
          children: Array.from(platformsMap.entries()).map(([platformId, platformNotes]) => {
            const platform = platformNotes[0]?.platform;
            return {
              id: `platform-${platformId}`,
              label: platform?.name || 'Платформа',
              type: 'platform',
              count: platformNotes.length,
              children: platformNotes.map(note => ({
                id: `material-${note.id}`,
                label: note.title,
                type: 'material',
                parentId: `platform-${platformId}`,
              })),
            };
          }),
        })}

        {/* Курсы */}
        {coursesMap.size > 0 && renderTreeNode({
          id: 'courses',
          label: 'Курсы',
          type: 'course',
          count: Array.from(coursesMap.values()).flat().length,
          children: Array.from(coursesMap.entries()).map(([courseId, courseNotes]) => {
            const course = courseNotes[0]?.course;
            return {
              id: `course-${courseId}`,
              label: course?.title || 'Курс',
              type: 'course',
              count: courseNotes.length,
              children: courseNotes.map(note => ({
                id: `material-${note.id}`,
                label: note.title,
                type: 'material',
                parentId: `course-${courseId}`,
              })),
            };
          }),
        })}

        {/* Теги */}
        {tagsMap.size > 0 && renderTreeNode({
          id: 'tags',
          label: 'Теги',
          type: 'tag',
          count: Array.from(tagsMap.values()).flat().length,
          children: Array.from(tagsMap.entries()).map(([tag, tagNotes]) => {
            return {
              id: `tag-${tag}`,
              label: tag,
              type: 'tag',
              count: tagNotes.length,
              children: tagNotes.map(note => ({
                id: `material-${note.id}`,
                label: note.title,
                type: 'material',
                parentId: `tag-${tag}`,
              })),
            };
          }),
        })}

        {/* Без категории */}
        {uncategorizedCount > 0 && renderTreeNode({
          id: 'uncategorized',
          label: 'Без категории',
          type: 'uncategorized',
          count: uncategorizedCount,
          children: notes
            .filter(n => !n.platformId && !n.courseId && (!n.tags || n.tags.length === 0))
            .map(note => ({
              id: `material-${note.id}`,
              label: note.title,
              type: 'material',
              parentId: 'uncategorized',
            })),
        })}
      </CardContent>
    </Card>
  );
}

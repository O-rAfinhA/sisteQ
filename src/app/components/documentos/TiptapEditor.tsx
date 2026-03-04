import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { useEffect, useMemo } from 'react';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Table as TableIcon,
  Link as LinkIcon,
  Highlighter,
  Code
} from 'lucide-react';
import { Button } from '../ui/button';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export function TiptapEditor({ content, onChange, editable = true }: TiptapEditorProps) {
  // Memoize extensions to prevent recreation on every render
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      // Disable extensions that we're adding separately to avoid duplicates
      link: false,
      underline: false,
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse border border-gray-300',
      },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class: 'bg-gray-100 font-semibold border border-gray-300 px-3 py-2',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-gray-300 px-3 py-2',
      },
    }),
  ], []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
  }, [extensions]);

  // Update content when prop changes - avoid unnecessary updates
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, { emitUpdate: false });
      // Restore cursor position if possible
      if (from !== to || from !== 0) {
        editor.commands.setTextSelection({ from, to });
      }
    }
  }, [editor, content]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Cleanup on unmount - destroy editor properly
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (!editable) {
    return (
      <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {/* Undo/Redo */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
            title="Desfazer"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
            title="Refazer"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`h-8 px-2 text-xs font-semibold ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
            }`}
            title="Título 1"
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`h-8 px-2 text-xs font-semibold ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
            }`}
            title="Título 2"
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`h-8 px-2 text-xs font-semibold ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''
            }`}
            title="Título 3"
          >
            <Heading3 className="w-4 h-4" />
          </Button>
        </div>

        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Negrito"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Itálico"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
            title="Sublinhado"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('highlight') ? 'bg-yellow-200' : ''}`}
            title="Destacar"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Lista com marcadores"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Lista numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="Alinhar à esquerda"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="Centralizar"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
            title="Alinhar à direita"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
            title="Justificar"
          >
            <AlignJustify className="w-4 h-4" />
          </Button>
        </div>

        {/* Table & Link */}
        <div className="flex gap-1 border-r border-gray-300 pr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addTable}
            className="h-8 w-8 p-0"
            title="Inserir tabela"
          >
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addLink}
            className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
            title="Inserir link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-gray-200' : ''}`}
            title="Código"
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

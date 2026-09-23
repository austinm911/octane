# @octanejs/blocknote

Headless [BlockNote](https://www.blocknotejs.org) editor for Octane. It covers the editor surface of `@blocknote/react@0.53.0` without the default UI, and uses `@blocknote/core` unchanged.

## Install

```bash
npm install @octanejs/blocknote
pnpm add @octanejs/blocknote
```

## Usage

```tsx
import { BlockNoteViewRaw, useCreateBlockNote } from '@octanejs/blocknote';

export function Editor() @{
	const editor = useCreateBlockNote({
		initialContent: [{ type: 'paragraph', content: 'Hello' }],
	});

	<BlockNoteViewRaw editor={editor} onChange={() => console.log(editor.document)} />
}
```

`BlockNoteViewRaw` imports `@blocknote/core/style.css`. Toolbars, menus, and other UI are yours to build. Render them as children, read the editor with `useBlockNoteEditor()`, and use `renderEditor={false}` with `<BlockNoteViewEditor />` to control where the editable area goes.

## Exports

- `BlockNoteViewRaw`, `BlockNoteViewEditor`, `BlockNoteViewProps`
- `BlockNoteContext`, `useBlockNoteContext`, `BlockNoteContextValue`
- `useCreateBlockNote`, `useBlockNoteEditor`
- `useEditorChange`, `useEditorSelectionChange`, `usePrefersColorScheme`
- `PortalElementsMap`, `PortalTarget`

## Server rendering

Server rendering is supported. The server emits the view shell, and the editor mounts into it on the client after hydration. Document content is not part of the server HTML. Without a `theme` prop the server renders the light scheme, and the system scheme applies after hydration. Pass `theme` to fix it on both sides.

## Known differences

- No default UI. `BlockNoteView`, `BlockNoteDefaultUI`, `ComponentsContext`, and the toolbar, menu, side-menu, table-handle, and comment components are not provided. Upstream disables all of them when no components context exists, so `BlockNoteViewRaw` here matches that upstream configuration.
- `BlockNoteViewRaw` does not accept the default UI flags (`formattingToolbar`, `slashMenu`, and so on). `portalElements` reads only `default`.
- Custom React block, inline content, and style specs are not provided.
- Event handlers receive native DOM events, as everywhere in Octane.

## Provenance

Independently authored and MIT licensed. See [UPSTREAM.md](./UPSTREAM.md).

import { v4 as uuid } from 'uuid';

/*
  - Cursor
  - Block
    - DocumentBlock
    - ItemBlock
      - TextBlock
*/

export type BlockId = string;

function createBlock(block: any): ItemBlockType | null {
  switch (block.type) {
    case 'text': {
      return new TextBlock(block);
    }
  }
  return null;
}

/* Cursor */
export class Cursor {
  public doc: DocumentBlock;

  public id: string;

  public anchorId: BlockId;

  public anchorOffset: number;

  public focusId: BlockId;

  public focusOffset: number;

  constructor(cursor: {
    id?: string;
    anchorId?: BlockId | null;
    anchorOffset?: number;
    focusId?: BlockId | null;
    focusOffset?: number;
  } = {}) {
    this.id = cursor.id || uuid();
    this.anchorId = cursor.anchorId || null;
    this.anchorOffset = cursor.anchorOffset || 0;
    this.focusId = cursor.focusId || null;
    this.focusOffset = cursor.focusOffset || 0;
  }

  public toJSON() {
    return {
      id: this.id,
      anchorId: this.anchorId,
      anchorOffset: this.anchorOffset,
      fosueId: this.focusId,
      focusOffset: this.focusOffset,
    }
  }
}

/* Blocks */
export abstract class Block {
  public id: BlockId;

  public type: string;

  public children: ItemBlockType[] = [];

  public doc: DocumentBlockType | null = null;

  private listeners: any[] = [];

  constructor(block: {
    id?: BlockId;
    type?: string;
    children?: ItemBlockType[];
  }) {
    this.id = block.id || uuid();
    if (block.children) {
      for (let i = 0; i < block.children.length; i += 1) {
        const b = createBlock(block.children[i]);
        if (b) {
          this.append(b);
        }
      }
    }
  }

  public isItemBlock(): this is ItemBlockType {
    return this.type !== 'document';
  }

  public isDocumentBlock(): this is DocumentBlockType {
    return this.type === 'document';
  }

  public append(block: ItemBlockType) {
    block.doc = this.doc;
    block.parent = this;
    block.prev = this.children[this.children.length - 1] || null;
    if (block.prev) {
      block.prev.next = block;
    }
    block.next = null;
    this.children.push(block);
  }

  public find(id: BlockId): ItemBlockType {
    function find(blocks: ItemBlockType[], id: BlockId): ItemBlockType {
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        if (block.id === id) {
          return block;
        }
        const b = find(block.children, id);
        if (b) {
          return b;
        }
      }
    }
    return find(this.children, id);
  }

  public dispatch() {
    this.listeners.forEach((listener) => {
      (listener.bind())();
    });
  }

  public addChangeListener(listener) {
    this.listeners.push(listener);
  }

  public removeChangeListener(listener?) {
    if (listener) {
      this.listeners.filter((lstnr) => lstnr !== listener);
    } else {
      this.listeners = [];
    }
  }

  public toJSON() {
    return {
      id: this.id,
      type: this.type,
      children: this.children.map((b) => {
        return b.toJSON();
      }),
    };
  }
}

export type BlockType = DocumentBlockType | ItemBlockType | Block;

/* Document Blocks */
export class DocumentBlock extends Block {
  public type = 'document';

  private cursor: Cursor;

  constructor(block: {
    id?: string;
    type?: string;
    children?: ItemBlockType[];
    cursor?: Cursor;
  } = {}) {
    super({ id: block.id, type: block.type, children: block.children });
    this.doc = this;
    this.cursor = block.cursor ? new Cursor(block.cursor) : new Cursor();
    this.cursor.doc = this;
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      cursor: this.cursor.toJSON(),
    };
  }
}

export type DocumentBlockType = DocumentBlock;

/* Item Blocks */
export abstract class ItemBlock extends Block {
  public parent: BlockType | null = null;

  public prev: ItemBlockType | null = null;

  public next: ItemBlockType | null = null;

  public hasText(): this is (TextBlock) {
    return this.type === 'text';
  }
}

export class TextBlock extends ItemBlock {
  public type = 'text';

  public text: string;

  constructor(block: {
    id?: BlockId;
    type?: string;
    text?: string;
    children?: ItemBlockType[];
  }) {
    super({ id: block.id, type: block.type, children: block.children });
    this.text = block.text || '';
  }
  public toJSON() {
    return {
      ...super.toJSON(),
      text: this.text,
    };
  }
}

export type ItemBlockType = TextBlock | ItemBlock;

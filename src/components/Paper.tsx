import * as React from 'react';

import { Schema, Block } from '../schema';
import { Paper } from '../model';
import { CommandContext, commands } from '../commands';
import { afterRendering, keepSelectionPosition } from './utils';
import { BlockComponent, BlockComponentProps } from './Block';

import styles from './index.module.scss';

type PaperComponentProps = {
  schema: Schema;
  paper: Paper;
};

type PaperComponentState = {
  blocks: Block[];
};

export class PaperComponent extends React.Component<PaperComponentProps, PaperComponentState> {
  public state: {
    blocks: Block[];
  } = {
    blocks: [],
  };

  private schema: Schema;

  private sort: {
    target: {
      el: HTMLDivElement;
      id: string | null;
    } | null;
    to: {
      el: HTMLDivElement;
      id: string | null;
    } | null;
  } = {
    target: null,
    to: null,
  };

  private ref: React.RefObject<HTMLDivElement>;

  constructor(props: PaperComponentProps) {
    super(props);
    this.state = { blocks: props.paper.blocks };
    this.schema = props.schema;
    this.ref = React.createRef<HTMLDivElement>();

    this.onPaperChange = this.onPaperChange.bind(this);
    this.onHandlePointerDown = this.onHandlePointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onTextKeyDown = this.onTextKeyDown.bind(this);
    this.onTextInput = this.onTextInput.bind(this);
  }

  public componentDidMount() {
    this.props.paper.onChange(this.onPaperChange);
  }

  public componentWillUnmount() {
    this.props.paper.offChange(this.onPaperChange);
  }

  private findBlockElement(blockId: string): HTMLDivElement | null {
    return this.ref.current.querySelector(`[data-blockid="${blockId}"]`);
  }

  private findFocusableElementFromBlockElement(blockElement: HTMLDivElement): HTMLElement {
    return blockElement.querySelector('[contentEditable]');
  }

  private onPaperChange(p) {
    this.setState({ blocks: p.blocks });
  }

  private onHandlePointerDown(event: React.MouseEvent<HTMLSpanElement>, props: BlockComponentProps) {
    const blocks = this.props.paper.findGroupedBlocks(props.block.id);
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      const el = this.findBlockElement(b.id);
      el.classList.add(styles['is_handling']);
    }

    const el = this.findBlockElement(props.block.id);
    this.sort.target = {
      el,
      id: props.block.id,
    };
  }

  private onPointerMove(event: React.MouseEvent<HTMLSpanElement>, props: BlockComponentProps) {
    const blocks = this.props.paper.blocks;

    if (this.sort.target) {
      if (this.sort.to) {
        this.sort.to.el.classList.remove(styles['is_hover_upper']);
        this.sort.to.el.classList.remove(styles['is_hover_lower']);
      }

      let el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
      if (el && !el.dataset.blockid) {
        el = el.parentElement;
      }
      const blockId = el.dataset.blockid;
      const blockIds = this.props.paper.findGroupedBlocks(this.sort.target.id).map((b) => b.id);

      if (!blockIds.includes(blockId)) {
        this.sort.to = {
          el: el as HTMLDivElement,
          id: el.dataset.blockid,
        };
      } else {
        this.sort.to = null;
      }

      if (this.sort.to) {
        let targetIndex = 0;
        let toIndex = 0;

        for (let i = 0; i < blocks.length; i += 1) {
          if (this.sort.target.id === blocks[i].id) {
            targetIndex = i;
          }

          if (this.sort.to.id === blocks[i].id) {
            toIndex = i;
          }
        }

        if (targetIndex > toIndex) {
          this.sort.to.el.classList.add(styles['is_hover_upper']);
        } else {
          this.sort.to.el.classList.add(styles['is_hover_lower']);
        }
      }
    }
  }

  private onPointerUp(event: React.MouseEvent<HTMLSpanElement>, props: BlockComponentProps) {
    const paper = this.props.paper;
    const blocks = this.state.blocks;

    if (this.sort.target && this.sort.to) {
      paper
        .tr(() => {
          let targetIndex = 0;
          let toIndex = 0;

          for (let i = 0; i < blocks.length; i += 1) {
            if (this.sort.target.id === blocks[i].id) {
              targetIndex = i;
            }

            if (this.sort.to.id === blocks[i].id) {
              toIndex = i;
            }
          }

          const l = this.props.paper.findGroupedBlocks(this.sort.target.id).length;
          const newBlocks = [...blocks];
          const sort = newBlocks.splice(targetIndex, l);
          newBlocks.splice(toIndex < targetIndex ? toIndex : toIndex - l + 1, 0, ...sort);
          paper.setBlocks(newBlocks);
        })
        .commit();
    }

    if (this.sort.target) {
      const blocks = this.props.paper.findGroupedBlocks(this.sort.target.id);
      for (let i = 0; i < blocks.length; i += 1) {
        const b = blocks[i];
        const el = this.findBlockElement(b.id);
        el.classList.remove(styles['is_handling']);
      }
    }
    if (this.sort.to) {
      this.sort.to.el.classList.remove(styles['is_hover_upper']);
      this.sort.to.el.classList.remove(styles['is_hover_lower']);
    }

    this.sort.target = null;
    this.sort.to = null;
  }

  private onTextKeyDown(event: React.KeyboardEvent<HTMLSpanElement>, props: BlockComponentProps) {
    const paper = this.props.paper;
    const blocks = this.state.blocks;
    const block = props.block;

    const defaultSchema = this.schema.defaultSchema();

    const key = event.key;
    // const meta = event.metaKey;
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey;

    // const sel = window.getSelection() as any; /* TODO focusNode.length is undefined? */
    const sel = window.getSelection();
    const ctx: CommandContext = {
      block,
      schema: this.schema,
      paper: this.props.paper,
      sel,
    };

    if ((key === 'b' && ctrl) || (key === 'i' && ctrl) || (key === 's' && ctrl)) {
      event.preventDefault();
    } else if (key === 'm' && ctrl) {
      event.preventDefault();
      keepSelectionPosition();
      paper.tr(() => {
        const newBlocks = [...blocks].map((b) => {
          if (block.id === b.id) {
            return this.schema.createBlock('list', b);
          }
          return {
            ...b,
          };
        });
        paper.setBlocks(newBlocks);
      });
    } else if (key === 'Enter') {
      event.preventDefault();
      if (block.type !== defaultSchema.type && block.text === '') {
        keepSelectionPosition();
        commands.turnInto(ctx, defaultSchema.type as Block['type']);
      } else {
        afterRendering(() => {
          const nextBlock = paper.findNextBlock(block.id);
          const nextBlockEl = this.findBlockElement(nextBlock.id);
          const nextFocusableElement = this.findFocusableElementFromBlockElement(nextBlockEl);
          if (nextFocusableElement) {
            // nextFocusableElement.focus();
            const range = document.createRange();
            const textNode = nextFocusableElement.childNodes[0];
            range.setStart(textNode, 0);
            range.setEnd(textNode, 0);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        });
        commands.splitBlock(ctx);
      }
    } else if (key === 'Backspace') {
      if (sel.isCollapsed && sel.anchorOffset == 0) {
        if (block.type !== defaultSchema.type) {
          keepSelectionPosition();
          commands.turnInto(ctx, 'paragraph');
        } else if (block.indent > 0) {
          keepSelectionPosition();
          commands.outdent(ctx);
        } else {
          const prevBlock = this.props.paper.findPrevBlock(block.id);
          const prevBlockEl = this.findBlockElement(prevBlock.id);
          const prevFocusableElement = this.findFocusableElementFromBlockElement(prevBlockEl);
          if (prevFocusableElement) {
            event.preventDefault();
            // prevFocusableElement.focus();
            const range = document.createRange();
            const textNode: Text = prevFocusableElement.childNodes[0] as Text;
            range.setStart(textNode, textNode.length);
            range.setEnd(textNode, textNode.length);
            sel.removeAllRanges();
            sel.addRange(range);

            keepSelectionPosition();
            commands.combineBlock(ctx);
          }
        }
      }
    } else if (key === 'Tab' && !shift) {
      event.preventDefault();
      commands.indent(ctx);
    } else if (key === 'Tab' && shift) {
      event.preventDefault();
      commands.outdent(ctx);
    } else if (key === 'ArrowDown' && !shift) {
      // console.log(sel.focusNode.constructor.name);
      if (sel.isCollapsed && (sel.focusNode as Text).length === sel.focusOffset) {
        event.preventDefault();
        const nextBlock = paper.findNextBlock(block.id);
        const nextBlockEl = this.findBlockElement(nextBlock.id);
        const nextFocusableElement = this.findFocusableElementFromBlockElement(nextBlockEl);
        if (nextFocusableElement) {
          nextFocusableElement.focus();
          const range = document.createRange();
          let textNode = nextFocusableElement.childNodes[0];
          if (!textNode) {
            textNode = document.createTextNode('');
            nextFocusableElement.appendChild(textNode);
          }
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (key === 'ArrowUp' && !shift) {
      if (sel.isCollapsed && sel.anchorOffset === 0) {
        event.preventDefault();
        const prevBlock = this.props.paper.findPrevBlock(block.id);
        const prevBlockEl = this.findBlockElement(prevBlock.id);
        const prevFocusableElement = this.findFocusableElementFromBlockElement(prevBlockEl);
        if (prevFocusableElement) {
          prevFocusableElement.focus();
          const range = document.createRange();
          let textNode = prevFocusableElement.childNodes[0];
          if (!textNode) {
            textNode = document.createTextNode('');
            prevFocusableElement.appendChild(textNode);
          }
          const focusNode: Text = sel.focusNode as Text;
          range.setStart(textNode, focusNode.length);
          range.setEnd(textNode, focusNode.length);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
    paper.commit();
  }

  private onTextInput(event: React.KeyboardEvent<HTMLSpanElement>, props: BlockComponentProps) {
    const value = event.currentTarget.innerText;
    const ctx: CommandContext = {
      block: props.block,
      schema: this.schema,
      paper: this.props.paper,
      sel: window.getSelection(),
    };
    commands.updateText(ctx, value);
    ctx.paper.commit();
  }

  public render() {
    const blocks = this.state.blocks;

    return (
      <div className={styles['paper']} ref={this.ref}>
        {blocks.map((block) => {
          return (
            <BlockComponent
              key={block.id}
              paper={this.props.paper}
              schema={this.schema}
              block={block}
              onHandlePointerDown={this.onHandlePointerDown}
              onPointerMove={this.onPointerMove}
              onPointerUp={this.onPointerUp}
              onTextKeyDown={this.onTextKeyDown}
              onTextInput={this.onTextInput}
            />
          );
        })}
      </div>
    );
  }
}

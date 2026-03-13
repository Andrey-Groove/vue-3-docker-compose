<template>
  <div
    class="c-game-cell"
    :class="{
      'c-game-cell--draggable': item,
      'c-game-cell--dragging': isDragging && item,
      'c-game-cell--empty': !item,
      'c-game-cell--max-tier': item && item.tier === 3
    }"
    :data-index="index"
    :draggable="!!item && !isDragging"
    @dragstart="(event) => onDragStart(event)"
    @dragend="() => onDragEnd()"
    @dragover.prevent
    @drop="(event) => onDrop(event)"
    @touchstart="() => onTouchStart()"
    @touchmove.prevent="(event) => onTouchMove(event)"
    @touchend="(event) => onTouchEnd(event)"
    @click="(event) => onCellClick(event)"
  >
    <span
      v-if="item"
      class="c-game-cell__content"
      :class="`c-game-cell__content--branch-${item.branch} c-game-cell__content--tier-${item.tier}`"
    >
      <span class="c-game-cell__emoji">{{ item.value }}</span>
      <span class="c-game-cell__level">{{ item.tier + 1 }}</span>
      <span class="c-game-cell__price">{{ getItemPrice() }}</span>
      <span v-if="item.tier === 3" class="c-game-cell__max-badge">MAX</span>
    </span>
  </div>
</template>

<script>
export default {
  name: 'GameCell',

  props: {
    item: {
      type: Object,
      default: null
    },
    index: {
      type: Number,
      required: true
    },
    isDragging: {
      type: Boolean,
      default: false
    }
  },

  emits: ['drag-start', 'drag-end', 'drop', 'touch-move', 'touch-end', 'cell-click'],

  data() {
    return {
      longPressTimer: null,
      BRANCHES: [
        { basePrice: 10, sellPrice: 40 },
        { basePrice: 50, sellPrice: 200 },
        { basePrice: 250, sellPrice: 1000 }
      ]
    }
  },

  methods: {
    getItemPrice() {
      if (!this.item) return 0
      const branch = this.BRANCHES[this.item.branch]
      if (this.item.tier === 3) {
        return branch.sellPrice
      }
      return branch.basePrice * (this.item.tier + 1)
    },

    onDragStart(event) {
      if (!this.item) return
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', this.index.toString())
      const dragIcon = document.createElement('div')
      dragIcon.className = 'c-game-cell__drag-preview'
      dragIcon.textContent = `${this.item.value} (${this.getItemPrice()})`
      document.body.appendChild(dragIcon)
      event.dataTransfer.setDragImage(dragIcon, 25, 25)
      setTimeout(() => document.body.removeChild(dragIcon), 0)
      this.$emit('drag-start', this.item, this.index)
    },

    onDragEnd() {
      this.$emit('drag-end')
    },

    onDrop(event) {
      event.preventDefault()
      this.$emit('drop', this.index)
    },

    onTouchStart() {
      if (!this.item) return
      this.longPressTimer = setTimeout(() => {
        this.$emit('touch-move', this.index)
      }, 200)
    },

    onTouchMove(event) {
      if (!this.item) return
      clearTimeout(this.longPressTimer)
      const touch = event.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const cellElement = element?.closest('.c-game-cell')
      if (cellElement) {
        const targetIndex = cellElement.dataset.index
        if (targetIndex !== undefined) {
          this.$emit('touch-move', parseInt(targetIndex))
        }
      }
    },

    onTouchEnd(event) {
      clearTimeout(this.longPressTimer)
      const touch = event.changedTouches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const cellElement = element?.closest('.c-game-cell')
      if (cellElement) {
        const targetIndex = cellElement.dataset.index
        if (targetIndex !== undefined) {
          this.$emit('touch-end', event, parseInt(targetIndex))
        }
      }
    },
    onCellClick(event) {
      if (this.item) {
        this.$emit('cell-click', this.item, this.index, event)
      }
    }
  }
}
</script>

<style lang="scss">
.c-game-cell {
  aspect-ratio: 1;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  user-select: none;
  touch-action: none;

  &--draggable {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &--dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }

  &--empty {
    background: #f8f8f8;
    border-style: dashed;
  }


  &:hover {
    transform: scale(1.02);
  }
  &__content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: 6px;
    &--branch-0 {
      background: #e8f5e8;
    }
    &--branch-1 {
      background: #ffebee;
    }
    &--branch-2 {
      background: #e3f2fd;
    }
  }

  &__emoji {
    font-size: inherit;
    margin-bottom: 12px;
  }

  &__level {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: #000000;
    color: white;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  &__price {
    position: absolute;
    bottom: 2px;
    right: 2px;
    font-size: 15px;
    font-weight: bold;
    color: #2e7d32;
    background: #ddeeff;
    padding: 2px 4px;
    border-radius: 4px;
  }

  &__max-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 8px;
    font-weight: bold;
    color: gold;
    background: #000000;
    padding: 2px 4px;
    border-radius: 4px;
  }

  &__drag-preview {
    position: absolute;
    top: -1000px;
    width: 50px;
    height: 50px;
    background: #667eea;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 24px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}
</style>
<template>
  <div class="c-game-page">
    <div class="c-game-page__header">
      <h1 class="c-game-page__title">Совмести пару</h1>
      <div class="c-game-page__score">
        Счёт: <span class="c-game-page__score-value">{{ score }}</span>
      </div>
    </div>

    <div class="c-game-page__controls">
      <button
        class="c-button"
        @click="() => buyRandomItem()"
        :disabled="isDragging || score < getMinPurchasePrice()"
      >
        Купить элемент (от {{ getMinPurchasePrice() }})
      </button>
      <button
        class="c-button c-button--red"
        @click="() => resetGame()"
      >
        Новая игра
      </button>
    </div>

    <div class="c-game-page__branches">
      <div
        v-for="(branch, branchIndex) in BRANCHES"
        :key="branchIndex"
        class="c-game-page__branch"
        :class="`c-game-page__branch--${branch.type}`"
      >
        <h3 class="c-game-page__branch-title">{{ branch.name }}</h3>
        <div class="c-game-page__branch-items">
          <div
            v-for="(item, itemIndex) in branch.items"
            :key="itemIndex"
            class="c-game-page__branch-item"
            :class="`c-game-page__branch-item--tier-${itemIndex}`"
          >
            {{ item }}
            <span class="c-game-page__branch-item-level">{{ itemIndex + 1 }}</span>
            <span class="c-game-page__branch-item-price">{{ getItemPrice(branchIndex, itemIndex) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="c-game-page__grid"
      :style="gridStyle"
      @dragover.prevent
      @drop="() => handleGridDrop()"
    >
      <GameCell
        v-for="(cell, index) in grid"
        :key="index"
        :item="cell"
        :index="index"
        :is-dragging="isDragging"
        @drag-start="(item, idx) => handleDragStart(item, idx)"
        @drag-end="() => handleDragEnd()"
        @drop="(idx) => handleDrop(idx)"
        @touch-move="(event, idx) => handleTouchMove(event, idx)"
        @touch-end="(event, idx) => handleTouchEnd(event, idx)"
        @cell-click="(item, idx, event) => handleCellClick(item, idx, event)"
      />
    </div>

    <div class="c-game-page__legend">
      <h3 class="c-game-page__legend-title">Правила и цены:</h3>
      <ul class="c-game-page__legend-list">
        <li>🌿 Природа: 10-40 очков за продажу</li>
        <li>🔥 Стихии: 50-200 очков за продажу</li>
        <li>⚡ Технологии: 250-1000 очков за продажу</li>
        <li>Клик по элементу: продажа за указанную цену</li>
        <li>Ctrl+клик по макс. элементу: переход на след. ветку (5 очков)</li>
      </ul>
    </div>
  </div>
</template>

<script>
import GameCell from '../ui/GameCell.vue'
const GRID_SIZE = 8
const STORAGE_KEY = 'game-state'

const BRANCHES = [
  {
    name: 'Природа',
    type: 'nature',
    items: ['🌱', '🌿', '🌳', '🏡'],
    basePrice: 10,
    sellPrice: 40,
    nextBranch: 1,
    multiplier: 1
  },
  {
    name: 'Стихии',
    type: 'elements',
    items: ['💧', '🔥', '💨', '🌪️'],
    basePrice: 50,
    sellPrice: 200,
    nextBranch: 2,
    multiplier: 5
  },
  {
    name: 'Технологии',
    type: 'tech',
    items: ['🔧', '⚙️', '🤖', '💻'],
    basePrice: 250,
    sellPrice: 1000,
    nextBranch: null,
    multiplier: 25
  }
]

export default {
  name: 'GamePage',

  components: {
    GameCell
  },

  data() {
    return {
      grid: [],
      score: 100,
      isDragging: false,
      draggedItem: null,
      draggedFromIndex: null,
      touchStartPosition: null,
      gridSize: GRID_SIZE,
      BRANCHES: BRANCHES
    }
  },

  computed: {
    gridStyle() {
      return {
        'grid-template-columns': `repeat(${this.gridSize}, 1fr)`
      }
    },
  },

  created() {
    this.loadGame()
  },

  methods: {
    loadGame() {
      const savedState = localStorage.getItem(STORAGE_KEY)
      if (savedState) {
        try {
          const { grid, score } = JSON.parse(savedState)
          this.grid = grid
          this.score = score
        } catch (e) {
          console.error('Ошибка загрузки сохранения:', e)
          this.initializeGrid()
        }
      } else {
        this.initializeGrid()
      }
    },

    saveGame() {
      const gameState = {
        grid: this.grid,
        score: this.score
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
    },

    initializeGrid() {
      this.grid = Array(this.gridSize * this.gridSize).fill(null)
      this.score = 100

      for (let i = 0; i < 5; i++) {
        this.addRandomItemToGrid(0)
      }

      this.saveGame()
    },

    resetGame() {
      if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
        this.initializeGrid()
      }
    },

    getMinPurchasePrice() {
      return BRANCHES[0].basePrice
    },
    getItemPrice(branchIndex, tier) {
      const branch = BRANCHES[branchIndex]

      if (tier === 3) {
        return branch.sellPrice
      }
      return branch.basePrice * (tier + 1)
    },

    buyRandomItem() {
      if (this.isDragging) return

      const emptyCells = this.getEmptyCells()
      if (emptyCells.length === 0) {
        alert('Нет свободных клеток!')
        return
      }
      const availableBranches = []
      if (this.score >= BRANCHES[0].basePrice) {
        availableBranches.push(0)
      }
      if (this.score >= BRANCHES[1].basePrice) {
        availableBranches.push(1)
      }
      if (this.score >= BRANCHES[2].basePrice) {
        availableBranches.push(2)
      }
      if (availableBranches.length === 0) {
        alert('Недостаточно очков для покупки любого элемента!')
        return
      }
      const branchIndex = availableBranches[Math.floor(Math.random() * availableBranches.length)]
      const price = BRANCHES[branchIndex].basePrice
      if (this.score >= price) {
        this.score -= price
        this.addRandomItemToGrid(branchIndex)
        this.saveGame()
      }
    },
    addRandomItemToGrid(branchIndex) {
      const emptyCells = this.getEmptyCells()
      if (emptyCells.length === 0) return false
      const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      const tier = 0
      this.grid[randomIndex] = {
        branch: branchIndex,
        tier: tier,
        value: BRANCHES[branchIndex].items[tier]
      }
      return true
    },

    getEmptyCells() {
      return this.grid.reduce((acc, cell, index) => {
        if (cell === null) acc.push(index)
        return acc
      }, [])
    },

    handleCellClick(item, index, event) {
      if (!item || this.isDragging) return
      const branch = BRANCHES[item.branch]
      const sellValue = this.getItemPrice(item.branch, item.tier)
      if (item.tier === branch.items.length - 1) {
        if (event && event.ctrlKey) {
          if (branch.nextBranch !== null) {
            if (this.score >= 5) {
              this.score -= 5
              this.convertToNextBranch(index, item.branch)
              this.saveGame()
              alert(`Элемент преобразован в ${BRANCHES[branch.nextBranch].name}!`)
            } else {
              alert('Недостаточно очков! Требуется 5 очков')
            }
          } else {
            alert('Это максимальная ветка! Дальнейшее развитие невозможно')
          }
        } else {
          if (confirm(`Продать элемент за ${sellValue} очков?`)) {
            this.score += sellValue
            this.grid[index] = null
            this.saveGame()
          }
        }
      } else {
        if (confirm(`Продать элемент за ${sellValue} очков?`)) {
          this.score += sellValue
          this.grid[index] = null
          this.saveGame()
        }
      }
    },

    convertToNextBranch(index, currentBranch) {
      const nextBranch = BRANCHES[currentBranch].nextBranch
      this.grid[index] = {
        branch: nextBranch,
        tier: 0,
        value: BRANCHES[nextBranch].items[0]
      }
    },

    handleDragStart(item, index) {
      if (!item) return
      this.isDragging = true
      this.draggedItem = item
      this.draggedFromIndex = index
    },

    handleDragEnd() {
      this.isDragging = false
      this.draggedItem = null
      this.draggedFromIndex = null
      this.touchStartPosition = null
    },

    handleDrop(targetIndex) {
      if (!this.draggedItem || this.draggedFromIndex === targetIndex) {
        this.handleDragEnd()
        return
      }
      this.mergeItems(this.draggedFromIndex, targetIndex)
      this.handleDragEnd()
    },

    handleGridDrop() {
      this.handleDragEnd()
    },

    handleTouchMove(event, index) {
      if (!this.touchStartPosition) {
        this.touchStartPosition = {
          index,
          item: this.grid[index]
        }
      }
    },

    handleTouchEnd(event, targetIndex) {
      if (!this.touchStartPosition || !this.touchStartPosition.item) {
        this.touchStartPosition = null
        return
      }
      if (this.touchStartPosition.index !== targetIndex) {
        this.mergeItems(this.touchStartPosition.index, targetIndex)
      }
      this.touchStartPosition = null
    },

    mergeItems(fromIndex, toIndex) {
      const fromItem = this.grid[fromIndex]
      const toItem = this.grid[toIndex]
      if (!fromItem) return
      if (!toItem) {
        this.grid[toIndex] = { ...fromItem }
        this.grid[fromIndex] = null
        this.saveGame()
        return
      }
      if (fromItem.branch === toItem.branch && fromItem.tier === toItem.tier) {
        const branch = BRANCHES[fromItem.branch]
        const newTier = fromItem.tier + 1
        if (newTier < branch.items.length) {
          let mergePoints = 0

          switch(fromItem.branch) {
            case 0:
              mergePoints = 5 + (fromItem.tier * 2)
              break
            case 1:
              mergePoints = 10 + (fromItem.tier * 3)
              break
            case 2:
              mergePoints = 15 + (fromItem.tier * 5)
          }
          this.score += mergePoints
          this.grid[toIndex] = {
            branch: fromItem.branch,
            tier: newTier,
            value: branch.items[newTier]
          }
          this.grid[fromIndex] = null
          console.log(`+${mergePoints} очков за совмещение!`)
        } else {
          return
        }
      } else {
        const temp = { ...fromItem }
        this.grid[fromIndex] = { ...toItem }
        this.grid[toIndex] = temp
      }
      this.saveGame()
    }
  }
}
</script>

<style lang="scss">
.c-game-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #667eea;
    border-radius: 10px;
    color: white;
  }

  &__title {
    margin: 0;
    font-size: 24px;
  }

  &__score {
    font-size: 20px;
    font-weight: bold;

    &-value {
      color: #ffd700;
    }
  }

  &__controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;

    .c-button {
      flex: 1;
    }
  }

  &__branches {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }

  &__branch {
    flex: 1;
    padding: 15px;
    border-radius: 10px;

    &--nature {
      background: #e8f5e8;
      border: 2px;
    }

    &--elements {
      background: #ffebee;
      border: 2px;
    }

    &--tech {
      background: #e3f2fd;
      border: 2px;
    }

    &-title {
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      color: #333;
    }

    &-items {
      display: flex;
      gap: 10px;
      justify-content: space-around;
      margin-bottom: 15px;
    }

    &-item {
      width: 60px;
      height: 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      border-radius: 8px;
      position: relative;
      background: #ffffffe5;

      &-level {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: #000000;
        color: white;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }

      &-price {
        position: absolute;
        bottom: 2px;
        right: 2px;
        font-size: 10px;
        font-weight: bold;
        color: #2e7d32;
        background: #ddeeff;
        padding: 2px 4px;
        border-radius: 4px;
      }
    }
  }

  &__grid {
    display: grid;
    gap: 4px;
    background: #f0f0f0;
    padding: 10px;
    border-radius: 10px;
    min-height: 400px;
  }

  &__legend {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 10px;

    &-title {
      margin: 0 0 10px 0;
      color: #333;
    }

    &-list {
      margin: 0;
      padding-left: 20px;
      color: #666;
      line-height: 1.6;
    }
  }
}
</style>
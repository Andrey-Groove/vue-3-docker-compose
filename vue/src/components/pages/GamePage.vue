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
        :disabled="isDragging || score < 10"
      >
        Купить элемент (10 очков)
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
        <li>🌿 Природа: продажа 10-40, совмещение 5-11 очков</li>
        <li>🔥 Стихии: продажа 50-200, совмещение 10-19 очков</li>
        <li>⚡ Технологии: продажа 250-1000, совмещение 15-30 очков</li>
        <li>💰 Покупка ЛЮБОГО элемента: 10 очков</li>
        <li> Ctrl+клик на MAX элемент: купить новый элемент за 5 очков</li>
        <li>Очки начисляются за продажу И совмещение элементов</li>
        <li>Клик по элементу: продажа за указанную цену</li>
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
    mergePoints: [5, 7, 9, 11]
  },
  {
    name: 'Стихии',
    type: 'elements',
    items: ['💧', '🔥', '💨', '🌪️'],
    basePrice: 50,
    sellPrice: 200,
    mergePoints: [10, 13, 16, 19]
  },
  {
    name: 'Технологии',
    type: 'tech',
    items: ['🔧', '⚙️', '🤖', '💻'],
    basePrice: 250,
    sellPrice: 1000,
    mergePoints: [15, 20, 25, 30]
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
        const randomBranch = Math.floor(Math.random() * 3)
        this.addRandomItemToGrid(randomBranch)
      }

      this.saveGame()
    },

    resetGame() {
      if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
        this.initializeGrid()
      }
    },

    getItemPrice(branchIndex, tier) {
      const branch = BRANCHES[branchIndex]

      if (tier === 3) {
        return branch.sellPrice
      }
      return branch.basePrice * (tier + 1)
    },

    getMergePoints(branchIndex, tier) {
      return BRANCHES[branchIndex].mergePoints[tier]
    },
    buyRandomItem() {
      if (this.isDragging) return

      const emptyCells = this.getEmptyCells()
      if (emptyCells.length === 0) {
        alert('Нет свободных клеток!')
        return
      }
      if (this.score < 10) {
        alert('Недостаточно очков! Нужно 10 очков')
        return
      }
      const availableBranches = [0, 1, 2]
      const randomIndex = Math.floor(Math.random() * availableBranches.length)
      const branchIndex = availableBranches[randomIndex]
      this.score -= 10
      this.addRandomItemToGrid(branchIndex)
      this.saveGame()
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
    addFirstLevelItem(branchIndex) {
      const emptyCells = this.getEmptyCells()
      if (emptyCells.length === 0) {
        alert('Нет свободных клеток для нового элемента!')
        return false
      }
      const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      this.grid[randomIndex] = {
        branch: branchIndex,
        tier: 0,
        value: BRANCHES[branchIndex].items[0]
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
          if (this.score >= 5) {
            const emptyCells = this.getEmptyCells()
            if (emptyCells.length === 0) {
              alert('Нет свободных клеток для нового элемента!')
              return
            }
            this.score -= 5
            this.addFirstLevelItem(item.branch)
            this.saveGame()
            alert(`Куплен новый элемент ${branch.items[0]} за 5 очков! (максимальный элемент сохранен)`)
          } else {
            alert('Недостаточно очков! Требуется 5 очков')
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
          const mergePoints = this.getMergePoints(fromItem.branch, fromItem.tier)
          this.score += mergePoints
          this.grid[toIndex] = {
            branch: fromItem.branch,
            tier: newTier,
            value: branch.items[newTier]
          }
          this.grid[fromIndex] = null
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
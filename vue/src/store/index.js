import { createStore } from 'vuex'

export default createStore({
  state: {
    score: 100
  },
  mutations: {
    UPDATE_SCORE(state, value) {
      state.score = value
    }
  },
  actions: {
    updateScore({ commit }, value) {
      commit('UPDATE_SCORE', value)
    }
  }
})
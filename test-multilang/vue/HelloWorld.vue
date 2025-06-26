<template>
  <div class="hello">
    <h1>{{ message }}</h1>
    <button @click="increment">点击次数: {{ count }}</button>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  
  data() {
    return {
      message: 'Hello Vue!',
      count: 0
    };
  },
  
  methods: {
    increment() {
      this.count++;
    },
    
    reset() {
      this.count = 0;
    }
  },
  
  mounted() {
    console.log('HelloWorld mounted');
  }
};
</script>

<style scoped>
.hello {
  text-align: center;
  padding: 20px;
}

h1 {
  color: #42b983;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #369870;
}
</style> 
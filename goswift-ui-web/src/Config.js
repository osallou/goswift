import { Component } from 'react';

class Config extends Component {
  static getConfig(){
      return {
          'url': 'http://localhost:6543'
      }
  }
  render() {
    return null;
  }
}

export default Config;

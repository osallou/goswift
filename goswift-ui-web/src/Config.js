import { Component } from 'react';

class Config extends Component {
  static getConfig(){
      return {
          'url': process.env.REACT_APP_GOSWIFT_BACKEND_URL || ''
      }
  }
  render() {
    return null;
  }
}

export default Config;

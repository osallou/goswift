import React, { Component } from 'react';
import Header from './Header';
import Home from './Home';
import Login from './Login';
import { Switch, Route, Redirect } from 'react-router-dom'

import './App.css';

const auth = {
    isAuthenticated: function(){
        var token = localStorage.getItem('goswift-token');
        if(token === undefined || token === null){
            console.log('not authenticated');
            return false;
        }
        else{
            console.log('authenticated');
            return true;
        }
    }
}

const PrivateRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={props => (
    auth.isAuthenticated() ? (
      <Component {...props}/>
    ) : (
      <Redirect to={{
        pathname: '/login',
        state: { from: props.location }
      }}/>
    )
  )}/>
)

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Switch>
          <PrivateRoute exact path='/' component={Home}/>
          <Route exact path='/login' component={Login}/>
        </Switch>
      </div>
    );
  }
}

export default App;

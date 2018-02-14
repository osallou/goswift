import React, { Component } from 'react';
import Header from './Header';
import Home from './Home';
import {Login, Logout} from './Login';
import Quota from './Quota';
import { Switch, Route, Redirect } from 'react-router-dom'
import { Auth } from './Auth';

import './App.css';


const PrivateRoute = ({ component: Component, ...rest }) => (
  <Route {...rest} render={props => (
    Auth.isAuthenticated() ? (
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
          <PrivateRoute exact path='/quota' component={Quota}/>
          <Route exact path='/login' component={Login}/>
          <Route exact path='/logout' component={Logout}/>
        </Switch>
      </div>
    );
  }
}

export default App;

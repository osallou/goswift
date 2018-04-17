import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Auth } from './Auth';

import './Header.css';

class Header extends Component {
  render() {
    let login = null;
    let logout = null;
    let quota_link = null;
    let hooks_link = null;
    if(! Auth.isAuthenticated()) {
        login = <li className="nav-item"><Link to='/login' className="nav-link">Login</Link></li>;
    }
    else {
        if(Auth.isAdmin() === true) {
        quota_link = <li className="nav-item"><Link to='/quota' className="nav-link">Quotas</Link></li>
        }
        hooks_link = <li className="nav-item"><Link to='/hooks' className="nav-link">Hooks</Link></li>
        logout = <li className="nav-item"><Link to='/logout' className="nav-link">Logout</Link></li>
    }
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <Link to='/' className="navbar-brand">GoSwift</Link>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav mr-auto">
                { hooks_link }
                { quota_link }
              </ul>
              <ul className="navbar-nav ml-auto">
                { login }
                { logout }
              </ul>
            </div>
        </nav>
    );
  }
}

export default Header;

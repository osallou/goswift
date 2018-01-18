import React, { Component } from 'react';
import { Card, CardText } from 'material-ui/Card';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import { Auth } from './Auth';
import { Redirect } from 'react-router-dom'

export class Logout extends Component {
    constructor(props) {
        super(props);
        Auth.logout();
    }
    render() {
        return (
            <Redirect to="/login"/>
        )
    }
}

export class Login extends Component {
  constructor(props) {
      super(props);
      this.state = {
          'login': {
              'domain': 'Users',
              'project': '',
              'user': '',
              'password': ''
          },
          'errors': null,
          'fireRedirect': false

      }
      this.handleSubmit = this.handleSubmit.bind(this);
      this.changeLogin = this.changeLogin.bind(this);
  }
  handleSubmit(event){
      event.preventDefault();
      // console.log(this.state.login);
      var ctx = this;
      Auth.login(this.state.login, function(res){
         if(res.status) {
             ctx.setState({'login': ctx.state.login, 'errors': null, 'fireRedirect': true});
         }
         else {
             ctx.setState({'login': ctx.state.login, 'errors': res.msg, 'fireRedirect': false});

         }
      });

  }
  changeLogin(event){
      const field = event.target.name;
      const login = this.state.login;
      login[field] = event.target.value;
      this.setState({'login': login, 'errors': null});
  }
  render() {
    var isError = this.state.errors !== null;
    let errorCard = null;
    if(isError){
        errorCard = <CardText className="alert alert-warning">Error: {this.state.errors}</CardText>
    }
    return (
      <div>
        {this.state.fireRedirect && (<Redirect to={'/'}/>)}
        <Card className="container">
            <form action="/" onSubmit={this.handleSubmit}>
                <h2 className="card-heading">Login</h2>
                {errorCard}
                <div className="field-line">
                    <TextField
                        floatingLabelText="Domain"
                        name="domain"
                        onChange={this.changeLogin}
                        value={this.state.login.domain}/>
                </div>
                <div className="field-line">
                    <TextField
                        floatingLabelText="Project"
                        name="project"
                        onChange={this.changeLogin}
                        value={this.state.login.project}/>
                </div>
                <div className="field-line">
                    <TextField
                        floatingLabelText="Name"
                        name="user"
                        onChange={this.changeLogin}
                        value={this.state.login.user}/>
                </div>
                <div className="field-line">
                    <TextField
                        floatingLabelText="Password"
                        type="password"
                        name="password"
                        onChange={this.changeLogin}
                        value={this.state.login.password}/>
                </div>
                <div className="button-line">
                    <RaisedButton type="submit" label="Log in" primary />
                </div>
            </form>
        </Card>
      </div>
    );
  }
}

//export default Login;

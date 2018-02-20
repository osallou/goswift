import React, { Component } from 'react';
import $ from 'jquery';
import { Auth } from './Auth';
import Config from './Config';
import { num } from './Utils';

import {
  Table,
  TableBody,
  TableRow,
  TableHeader,
  TableHeaderColumn,
  TableRowColumn,
} from 'material-ui/Table';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import CheckCircleIcon from 'material-ui-icons/CheckCircle';
import ReportProblemIcon from 'material-ui-icons/ReportProblem';

import './Hooks.css';

class Hooks extends Component {
    constructor(props){
        super(props);
        var config = Config.getConfig();
        this.state = {
            'hooks': [],
        };

    }

    loadHooks(){
        var ctx = this;
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/hook/" + authData.project,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            cache: false,
            dataType: "json",
            success: function(res){
                ctx.setState({'hooks': res.hooks});
            },
            error: function(jqXHR, textStatus, error){
                console.log('Failed to get hooks ' + error);
            }
        });
    }
    componentDidMount(){
        this.loadHooks();

    }
    render() {
      return (
          <div>
          <h2>Projects hooks</h2>
          <Table >
          <TableHeader>
          <TableRow>
          <TableHeaderColumn>Id</TableHeaderColumn>
          <TableHeaderColumn>Container</TableHeaderColumn>
          <TableHeaderColumn>File</TableHeaderColumn>
          <TableHeaderColumn>Status</TableHeaderColumn>
          </TableRow>
          </TableHeader>
          <TableBody>
          {this.state.hooks.map((hook, index) =>(
              <TableRow key={hook.id}>
                <TableRowColumn>{hook.id}</TableRowColumn>
                <TableRowColumn>{hook.bucket}</TableRowColumn>
                <TableRowColumn>{hook.file}</TableRowColumn>
                <TableRowColumn>
                    {hook.status === true && <CheckCircleIcon className="hookSuccess"/>}
                    {hook.status === false && <ReportProblemIcon className="hookFailure"/>}
                </TableRowColumn>
              </TableRow>
          ))}
          </TableBody>
          </Table>

          </div>
      )
    }
}
export default Hooks;

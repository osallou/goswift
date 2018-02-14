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

class Quota extends Component {
    constructor(props){
        super(props);
        var config = Config.getConfig();
        this.state = {
            'projects': [],
            'quotas': config.quotas
        };
        // console.log(this.state.quotas);
        this.changeQuota = this.changeQuota.bind(this);
        this.loadProjects = this.loadProjects.bind(this);
        // /api/<apiversion>/quota
    }
    changeQuota(event, index, value){
        console.log(value);
        var ctx = this;
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        var info = value.split(".");
        var project = info[0];
        var quota = info[1];
        // /api/<apiversion>/quota/project/<project>
        $.ajax({
            url: config.url + "/api/v1/quota/project/" + project,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "POST",
            cache: false,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({'quota': quota}),
            success: function(res){
                // console.log(res.projects);
                ctx.loadProjects();
            },
            error: function(jqXHR, textStatus, error){
                console.log('Failed to get projects ' + error);
            }
        });
    }
    loadProjects(){
        var ctx = this;
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/quota",
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            cache: false,
            dataType: "json",
            success: function(res){
                // console.log(res.projects);
                ctx.setState({'projects': res.projects});
            },
            error: function(jqXHR, textStatus, error){
                console.log('Failed to get projects ' + error);
            }
        });
    }
    componentDidMount(){
        this.loadProjects();

    }
    render() {
      return (
          <div>
          <h2>Projects quotas</h2>
          <Table >
          <TableHeader>
          <TableRow>
          <TableHeaderColumn>Id</TableHeaderColumn>
          <TableHeaderColumn>Name</TableHeaderColumn>
          <TableHeaderColumn>Quota</TableHeaderColumn>
          <TableHeaderColumn>Change quota</TableHeaderColumn>
          </TableRow>
          </TableHeader>
          <TableBody>
          {this.state.projects.map((project, index) =>(
              <TableRow key={project.id}>
                <TableRowColumn>{project.id}</TableRowColumn>
                <TableRowColumn>{project.name}</TableRowColumn>
                <TableRowColumn>
                    {num(project.quota)}
                </TableRowColumn>
                <TableRowColumn>
                    <SelectField
                      floatingLabelText="Quota"
                      value={project.id+'.'+num(project.quota)}
                      onChange={this.changeQuota}
                    >
                      {this.state.quotas.map((quota, qindex) =>(
                          <MenuItem key={qindex} value={project.id+'.'+quota} primaryText={quota} />
                      ))}
                      </SelectField>
                </TableRowColumn>
              </TableRow>
          ))}
          </TableBody>
          </Table>

          </div>
      )
    }
}
export default Quota;

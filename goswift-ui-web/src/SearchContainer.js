import React, { Component } from 'react';
import $ from 'jquery';
import { Auth } from './Auth';
import Config from './Config';
import SearchIcon from 'material-ui-icons/Search';
import TextField from 'material-ui/TextField';
import Chip from 'material-ui/Chip';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHeaderColumn,
  TableRowColumn,
} from 'material-ui/Table';

class SearchContainer extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'container': props.container,
              'search': '',
              'files': []
          }
          this.changeSearch = this.changeSearch.bind(this);
          this.searchFiles = this.searchFiles.bind(this);
      }
    componentWillReceiveProps(nextProps){
        if(nextProps.file !== undefined && nextProps.container !== this.state.container){
            this.setState({'container': nextProps.container, 'search': ''});
        }
    }
    changeSearch(event){
      var ctx = this;
      return function(event){
        ctx.setState({'search': event.target.value});
      }
    }
    searchFiles(){
        var ctx = this;
        return function(){
            console.log('search', ctx.state.search);
            var authData = Auth.getAuthData();
            var config = Config.getConfig();
            $.ajax({
                ///api/<apiversion>/index/project/<project>/<container>
                url: config.url + "/api/v1/search/project/" + authData.project + '/' +ctx.state.container.name,
                beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
                type: "POST",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify({'query': ctx.state.search}),
                cache: false,
                success: function(res){
                    console.log(res);
                    ctx.setState({'files': res.hits.hits});
                },
                error: function(jqXHR, textStatus, error){
                    console.log('Failed to get search results: ' + error);
                }
            });
        }
    }
  render() {
      this.styles = {
      chip: {
        margin: 4,
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap',
      },
    };
    return (
        <div>
        <TextField
                           floatingLabelText="Search"
                           name="search"
                           onChange={this.changeSearch()}
                           value={this.state.search}/>
                           <SearchIcon onClick={this.searchFiles()}/>
        <Table >
        <TableHeader>
        <TableRow>
        <TableHeaderColumn>Name</TableHeaderColumn>
        <TableHeaderColumn>Metadata</TableHeaderColumn>
        </TableRow>
        </TableHeader>
        <TableBody>
        {this.state.files.map((containerFile, index) =>(
            <TableRow key={containerFile._source.container}>
            <TableRowColumn>
                {containerFile._source.container}
            </TableRowColumn>
            <TableRowColumn>
                {containerFile._source.metadata.map((meta, index) =>(
                    <div key={index} style={this.styles.wrapper}>
                        {Object.keys(meta).map((metakey, index) =>(
                            <Chip style={this.styles.chip} key={metakey}>{metakey}: {meta[metakey]}</Chip>
                        ))}
                    </div>
                ))}
            </TableRowColumn>
            </TableRow>

        ))}
        </TableBody>
        </Table>
        </div>
    );
  }
}

export default SearchContainer;

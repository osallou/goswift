import React, { Component } from 'react';
import num from 'pretty-bytes';
import { Card, CardText, CardHeader, CardActions } from 'material-ui/Card';
import Dialog from 'material-ui/Dialog';
import { Container } from './Container';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import { GridList, GridTile } from 'material-ui/GridList';


class ContainerFileInfo extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'swift_url': props.swift_url,
              'file': props.file,
              'metas': [],
              'dialog': props.dialog || false,
              'onClose': props.onClose
          }
          this.handleDialogClose = this.handleDialogClose.bind(this);
          this.handleDialogSave = this.handleDialogSave.bind(this);
      };
      componentDidMount(){
          // get container object details
          var ctx = this;
          Container.metaContainerFile(this.state.swift_url, this.state.file.name, function(res){
              ctx.setState({'metas': res});
          });
      };

      componentWillReceiveProps(nextProps){
        var ctx = this;
        if(nextProps.file !== undefined){
            Container.metaContainerFile(this.state.swift_url, this.state.file.name, function(res){
                ctx.setState({'file': nextProps.file, 'dialog': nextProps.dialog, 'metas': res});
            });
        }
      }

  handleDialogClose(){
      this.setState({'dialog': false});
      if(this.state.onClose){
          this.state.onClose(this.state.file, this.state.meta);
      }
  }
  handleDialogSave(){
      this.setState({'dialog': false});
      if(this.state.onClose){
          this.state.onClose(this.state.file, this.state.meta);
      }
  }
  render() {
      const actions = [
            <FlatButton
              label="Close"
              primary={true}
              keyboardFocused={true}
              onClick={this.handleDialogClose}
            />,
            <FlatButton
              label="Save"
              primary={true}
              keyboardFocused={true}
              onClick={this.handleDialogSave}
            />,
        ];
    if(!this.state.dialog) {
         return null;
    }
    return (
        <Dialog
          title="File info"
          modal={false}
          actions={actions}
          open={this.state.dialog}
          onRequestClose={this.handleDialogClose}
        >
            <Card className="container">
                <CardHeader title={this.state.file.name} subtitle={this.state.file.last_modified}></CardHeader>
                <CardText>
                    <GridList>
                        <GridTile key="totalsize">
                            <div className="field-line">
                                <TextField
                                    floatingLabelText="Size"
                                    name="size"
                                    value={num(this.state.file.bytes)}
                                    disabled={true}/>
                            </div>
                        </GridTile>
                        {this.state.metas.map((meta, index) =>(
                            <GridTile key={meta.name}>
                                <div className="field-line">
                                    <TextField
                                        floatingLabelText={meta.name}
                                        name={meta.name}
                                        onChange={this.changeLogin}
                                        value={meta.value}
                                        disabled={true}/>
                                </div>
                            </GridTile>
                        ))}
                    </GridList>
               </CardText>
            </Card>
        </Dialog>
    );
  }
}

export default ContainerFileInfo;

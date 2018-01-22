import React, { Component } from 'react';
//import num from 'pretty-bytes';
import { num } from './Utils';
// import { Card, CardText, CardHeader, CardActions } from 'material-ui/Card';
import Dialog from 'material-ui/Dialog';
// import Divider from 'material-ui/Divider';
import { Container } from './Container';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
// import { GridList, GridTile } from 'material-ui/GridList';
// import AddIcon from 'material-ui-icons/Add';

class ContainerFileInfo extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'swift_url': props.swift_url,
              'file': props.file,
              'metas': [],
              'dialog': props.dialog || false,
              'onClose': props.onClose,
              'newMetaName': '',
              'error': ''
          }
          this.handleDialogClose = this.handleDialogClose.bind(this);
          this.handleDialogSave = this.handleDialogSave.bind(this);
          this.addMeta = this.addMeta.bind(this);
          this.changeNewMetaName = this.changeNewMetaName.bind(this);
          this.onMetaChange = this.onMetaChange.bind(this);
      };
      componentDidMount(){
          // get container object details
          var ctx = this;
          Container.metaContainerFile(this.state.swift_url, this.state.file.name, function(res){
              ctx.setState({'metas': res});
          });
      };

      componentWillReceiveProps(nextProps){
        console.log('new container file info props', nextProps);
        var ctx = this;
        if(nextProps.file !== undefined){
            Container.metaContainerFile(this.state.swift_url, this.state.file.name, function(res){
                ctx.setState({
                    'file': nextProps.file,
                    'dialog': nextProps.dialog,
                    'metas': res,
                    'swift_url': nextProps.swift_url
                });
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
      console.log('should update meta info');
      var ctx = this;
      Container.updateMetadataContainerFile(this.state.swift_url, this.state.file.name, this.state.metas, function(msg){
          if(msg.error){
              ctx.setState({'error': msg.error});
          }
          else {
              ctx.setState({'error': '', 'dialog': false});
              if(ctx.state.onClose){
                  ctx.state.onClose(ctx.state.file, ctx.state.metas);
              }
          }

      });
  }
  addMeta(){
      var ctx = this;
      return function(){
          if(! ctx.state.newMetaName) {return;}
          var newMetas = ctx.state.metas.slice();
          for(var i=0;i<newMetas.length;i++){
              if(newMetas[i].name === ctx.state.newMetaName){
                  return;
              }
          }
          newMetas.push({'name': ctx.state.newMetaName, 'value': ctx.state.newMetaValue});
          ctx.setState({'metas': newMetas});
      }
  }
  changeNewMetaName(event){
          var ctx = this;
          return function(event){
            ctx.setState({'newMetaName': event.target.value});
          }
  }
  onMetaChange(event){
      var newMetas = this.state.metas.slice();
      for(var i=0;i<newMetas.length;i++){
          var newMeta = newMetas[i];
          if(newMeta.name == event.target.name){
              newMeta.value = event.target.value;
              break;
          }
      }
      this.setState({'metas': newMetas});

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
          title={this.state.file.name}
          modal={false}
          actions={actions}
          open={this.state.dialog}
          onRequestClose={this.handleDialogClose}
          autoScrollBodyContent={true}
        >
            { this.state.error && <div class="label label-error">{this.state.error}</div>}
            <div className="row">
                <div className="col-sm-6">
                    <div className="field-line" >
                        <TextField
                            floatingLabelText="Last modified"
                            name="last_modified"
                            value={this.state.file.last_modified}
                            disabled={true}/>
                    </div>
                    <div className="field-line" >
                        <TextField
                            floatingLabelText="Size"
                            name="size"
                            value={num(this.state.file.bytes)}
                            disabled={true}/>
                    </div>
                    <div className="field-line">
                        <TextField
                            floatingLabelText="new metadata name"
                            name="meta_name"
                            value={this.state.newMetaName}
                            onChange={this.changeNewMetaName()}
                            disabled={false}/>
                        <RaisedButton secondary={true} label="Add meta property" onClick={this.addMeta()} />
                    </div>
                </div>
                <div className="col-sm-6">
                {this.state.metas.map((meta, index) =>(
                        <div key={meta.name} className="field-line">
                            <TextField
                                floatingLabelText={meta.name}
                                name={meta.name}
                                value={meta.value}
                                onChange={this.onMetaChange}
                                disabled={false}/>
                        </div>
                ))}
                </div>
            </div>

        </Dialog>
    );
  }
}

export default ContainerFileInfo;

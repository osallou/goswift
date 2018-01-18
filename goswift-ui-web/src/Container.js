import $ from 'jquery';
import { Auth } from './Auth';
import Config from './Config';

export class Container {
    static listContainerDirectory(url, filepath, callback){
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '?format=json&path=' + filepath+'&delimiter=/&prefix=',
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to list: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static listContainers(callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            success: function(res){
                callback({'containers': res.containers});
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                callback({'error': error, 'status': jqXHR.status})
                console.log('Failed to get containers ' + error);
            }
        });
    }
    static createContainer(bucket, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project + '/' + bucket,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "POST",
            dataType: "json",
            success: function(res){
                //callback({'status': true});
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to create container: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static getContainerDetails(bucket, path, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project + '/' + bucket,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            success: function(res){
                //callback({'status': true});
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to get container details: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static getContainerMeta(bucket, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project + '/' + bucket,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "HEAD",
            dataType: "json",
            success: function(res, textStatus, request){
                //callback({'status': true});
                var result = [];
                var headers = request.getAllResponseHeaders().split("\n");
                for(var i=0;i<headers.length;i++){
                    var header = headers[i].replace(/[\n\r]+/g, '');;
                    // console.log('cont meta header', header);
                    if(header.startsWith('x-container-')){
                        var keyvalue = header.split(':')
                        result.push({'name': keyvalue[0].replace('x-container-', '').trim(), 'value': keyvalue[1].trim()});
                    }
                }
                callback(result);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to get container meta: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static downloadContainerFile(bucket, path, filepath, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project + '/' +bucket + '/' + filepath,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to get tempurl: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static getTmpUrlForUploadContainerFile(bucket, path, filepath, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/project/" + authData.project + '/' +bucket + '/' + filepath + '?method=PUT',
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to get tempurl for upload: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static deleteContainerFile(url, filepath, callback){
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '/' + filepath,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "DELETE",
            dataType: "json",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to delete: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static deleteContainer(url, containerName, callback){
        var authData = Auth.getAuthData();
        $.ajax({
            url: url,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "DELETE",
            dataType: "json",
            success: function(res){
                callback({'msg': 'container deleted'});
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to delete: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static metaContainerFile(url, filepath, callback){
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '/' + filepath,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "HEAD",
            dataType: "json",
            success: function(res, textStatus, request){
                var result = [];
                var headers = request.getAllResponseHeaders().split("\n");
                for(var i=0;i<headers.length;i++){
                    var header = headers[i].replace(/[\n\r]+/g, '');;
                    //console.log('header', header);
                    if(header.startsWith('x-object-meta-')){
                        var keyvalue = header.split(':')
                        result.push({'name': keyvalue[0].replace('x-object-meta-', '').trim(), 'value': keyvalue[1].trim()});
                    }
                }
                callback(result);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to get file meta: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static createDirectory(url, basepath, filepath, callback){
        var authData = Auth.getAuthData();
        var dirpath = basepath.join('') + filepath.trim();
        if(! filepath.endsWith('/')){
            dirpath = basepath.join('') + filepath.trim() + '/';
        }
        $.ajax({
            url: url + '/' + dirpath +'?format=json',
            beforeSend: function(xhr){
                xhr.setRequestHeader('X-Auth-Token', authData.token);
                xhr.setRequestHeader('Content-Type', 'application/directory');
            },
            type: "PUT",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                //callback({'status': false, 'msg': error});
                console.log('Failed to add directory: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }

}

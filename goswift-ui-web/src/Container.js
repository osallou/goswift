import $ from 'jquery';
import { Auth } from './Auth';
import Config from './Config';

let _expirationCallback = null;

export class Container {

    static get expirationCallback() { return _expirationCallback; }
    static set expirationCallback(value) { _expirationCallback = value; }

    static onExpiration(callback){
        Container.expirationCallback = callback;
    }
    static hasExpired(status){
        if(status === 401){
            console.log("status 401, session expired");
            if(Container.expirationCallback){
                Container.expirationCallback();
            }
            return true;
        }
        else {
            return false;
        }
    }
    static listContainerDirectory(url, filepath, callback){
        // console.log('listContainerDirectory');
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '?format=json&prefix=' + encodeURIComponent(filepath)+'&delimiter=%2F',
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            cache: false,
            dataType: "json",
            success: function(res){
                var files = []
                for(var i=0;i<res.length;i++){
                    var file = res[i];

                    if(file.subdir !== undefined){
                        file.content_type = 'application/directory';
                        file.name = file.subdir;
                        file.bytes = 0;
                        file.last_modified = new Date();
                    }
                    if(file.name !== filepath) {
                        files.push(file);
                    }
                    // console.log(file);
                }
                callback(files);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to list: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static listContainerSubFiles(url, filepath, callback){
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '?format=json&prefix=' + encodeURIComponent(filepath),
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            cache: false,
            dataType: "json",
            success: function(res){
                var files = []
                for(var i=0;i<res.length;i++){
                    var file = res[i];
                    if(file.subdir !== undefined){
                        file.content_type = 'application/directory';
                        file.name = file.subdir;
                        file.bytes = 0;
                        file.last_modified = new Date();
                    }
                    if(file.name !== filepath) {
                        files.push(file);
                    }
                }
                callback(files);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
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
            cache: false,
            dataType: "json",
            success: function(res){
                /*
                var containers = [];
                for(var i=0;i<res.containers.length;i++){
                    if(! res.containers[i].name.endsWith('_segments')){
                        containers.push(res.containers[i]);
                    }
                }
                callback({'containers': containers});
                */
                callback({'containers': res.containers, 'quota': res.quota});
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}

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
                if(Container.hasExpired(jqXHR.status)){return;}
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
            // url: config.swift_url + '/v1/AUTH_' + authData.project + '/' + bucket +'?format=json&path=&delimiter=/&prefix=',
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "GET",
            dataType: "json",
            cache: false,
            success: function(res){
                //callback({'status': true});
                //var url = config.swift_url + '/v1/AUTH_' + authData.project + '/' + bucket;
                callback({'container': res.container, 'swift_url': res.url});
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to get container details: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static getContainerMeta(bucket, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        var swift_url = config.swift_url + '/v1/AUTH_' + authData.project + '/' + bucket + '?format=json';
        $.ajax({
            // url: config.url + "/api/v1/project/" + authData.project + '/' + bucket,
            url: swift_url,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "HEAD",
            dataType: "json",
            cache: false,
            success: function(res, textStatus, request){
                //callback({'status': true});
                var result = [];
                var headers = request.getAllResponseHeaders().split("\n");
                for(var i=0;i<headers.length;i++){
                    var header = headers[i].replace(/[\n\r]+/g, '');;
                    // console.log('cont meta header', header);
                    if(header.startsWith('x-container-meta-access')){
                        continue;
                    }
                    if(header.startsWith('x-container-')){
                        var keyvalue = header.split(':')
                        result.push({'name': keyvalue[0].replace('x-container-', '').trim(), 'value': keyvalue[1].trim()});
                    }
                }
                callback(result);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
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
            cache: false,
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
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
            cache: false,
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to get tempurl for upload: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static deleteContainerFile(url, filepath, callback){
         // console.log('FAKE DELETE', url, filepath);
         // callback({'fake': true});
         // return;
        var authData = Auth.getAuthData();
        $.ajax({
            url: url + '/' + filepath,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "DELETE",
            dataType: "json",
            success: function(res){
                callback({'res': res});
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
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
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to delete: ' + error);
                callback({'error': error, 'status': jqXHR.status});
            }
        });
    }
    static metaContainerFile(url, filepath, callback){
        var authData = Auth.getAuthData();
        // var config = Config.getConfig();
        //var swift_url = config.swift_url + '/v1/AUTH_' + authData.project + '/' + bucket + '/'+ filepath +'?format=json&path=&delimiter=/&prefix=';
        $.ajax({
            url: url + '/' + filepath,
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "HEAD",
            dataType: "json",
            cache: false,
            success: function(res, textStatus, request){
                var result = [];
                var headers = request.getAllResponseHeaders().split("\n");
                var complex = false;
                var complex_url = null;
                for(var i=0;i<headers.length;i++){
                    var header = headers[i].replace(/[\n\r]+/g, '');;
                    // console.log('header', header);
                    var keyvalue = header.split(':')
                    if(header.startsWith('x-object-manifest')) {
                        result.push({'name': 'X-Object-Manifest', 'value': keyvalue[1].trim()})
                        complex = true;
                        complex_url = keyvalue[1].trim();
                    }
                    if(header.startsWith('x-object-meta-')){
                        result.push({'name': keyvalue[0].replace('x-object-meta-', '').trim(), 'value': keyvalue[1].trim()});
                    }
                }
                var about = {
                    'content_length': request.getResponseHeader('Content-Length'),
                    'complex': complex,
                    'complex_url': complex_url
                }
                callback({'meta': result, 'about': about});
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
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
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to add directory: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static updateMetadataContainerFile(url, filepath, metadata, callback){
        var authData = Auth.getAuthData();
        // var config = Config.getConfig();
        $.ajax({
            url: url + '/' + filepath +'?format=json',
            beforeSend: function(xhr){
                    xhr.setRequestHeader('X-Auth-Token', authData.token);
                    for(var i=0;i<metadata.length;i++){
                        var meta = metadata[i];
                        if(meta.name === 'X-Object-Manifest'){
                            xhr.setRequestHeader('X-Object-Manifest', meta.value);
                        }
                        else if(meta.value !== ""){
                            xhr.setRequestHeader('X-Object-Meta-' + meta.name, meta.value);
                        }
                    }
            },
            type: "POST",
            //dataType: "json",
            success: function(res){
                callback(res);
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to update metadata: ' + error);
                callback('error': error, 'status': jqXHR.status);
            }
        });
    }
    static inviteContainer(tmpurl, emails, callback){
        var authData = Auth.getAuthData();
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/tempurl",
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "POST",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({'url': tmpurl, 'emails': emails}),
            cache: false,
            success: function(res){
                callback({'msg': 'invitation sent'});
            },
            error: function(jqXHR, textStatus, error){
                if(Container.hasExpired(jqXHR.status)){return;}
                console.log('Failed to send invitation: ' + error);
                callback({'error': error, 'status': jqXHR.status})
            }
        });
    }
}

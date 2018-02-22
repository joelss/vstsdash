import axios from 'axios';
import * as _ from "lodash";

export class Vsts {
    vstsToken:string;
    vstsSiteName:string;
    vstsProjectName:string;

    readonly authHeader:string;

    constructor(vstsToken:string, vstsSiteName:string, vstsProjectName:string) {
        this.vstsToken = vstsToken;
        this.vstsSiteName = vstsSiteName;
        this.vstsProjectName = vstsProjectName;

        this.authHeader = 'Basic ' + btoa(':' + this.vstsToken);
    }

    async queryWorkItems(queryGuid:string) {
        console.log('Querying the work item ids using query '+  queryGuid);
        
        var vstsQueryPath = 'https://' + this.vstsSiteName + '.visualstudio.com/DefaultCollection/' + this.vstsProjectName + '/_apis/wit/wiql/' + queryGuid;
    
        var options = {
            //method: 'GET',
            url: vstsQueryPath,
            json: true,
            headers: 
            {
                authorization: this.authHeader
            }
        };

        let response = await axios(options);

        if(response.status !== 200) {
            return null;
        }

        let workItemIds = _.map(response.data.workItems, 'id');
        console.log('Loaded ' + workItemIds.length + ' work items');

        return workItemIds as Array<number>;
    }

    async expandWorkItems(workItemIds:number[], fields:string[]) {
        if(workItemIds.length > 200) {
            console.warn('Loading more than 200 work items is not supported yet!');
            workItemIds = workItemIds.slice(0, 200);
        }

        console.log('Querying the work item details');
    
        var options = {
            url: 'https://' + this.vstsSiteName + '.visualstudio.com/DefaultCollection/_apis/wit/workitems',
            params: { ids: workItemIds.join(','), 'api-version': '1.0', '$expand': 'relations' },
            json: true,
            headers: 
            {
                authorization: this.authHeader
            }
        }
    
        let response = await axios(options);
        let workItems = response.data.value;

        for(let wi of workItems) {
            if(wi.relations && wi.relations.length > 0) {
                let url = wi.relations[0].url;
                let r = new RegExp(/.*\/([0-9]+)/g);

                let parts = r.exec(url);
                wi.parentId = parts[1];
            }
        }

        return workItems;
    }
}
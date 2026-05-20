import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
export default ((request, response)=>{
    setPageMetaInfo(request, {
        title: translate('Create a new category'),
        description: translate('Create a new category')
    });
});

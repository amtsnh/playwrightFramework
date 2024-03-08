export default class StringUtils {

    async convertAnyToString(val: any){
        return val.toString();
    }


    async replaceAll(val: string, replaceChar: string) {
        if(val.constructor === String) {
            if (val.includes(replaceChar)){
                return val.split(replaceChar).join('').toString();
            }
        }
        return val;
    }

    async getIndex(sourceArray: string[][], expectedValues: string[], exactMatch: boolean = false){
        let row_index = sourceArray.findIndex((row_text) => {
        for (const col_data of expectedValues){
            if(exactMatch){
                if(row_text.findIndex((ele: any) => ele.trim().toLowerCase() === col_data.toLowerCase().trim()) < 0) return false;
            }
            else{
                if(row_text.findIndex((ele: any) => ele.trim().toLowerCase().includes(col_data.toLowerCase().trim())) < 0) return false;
            }
        }
        return true;
        });
        if(row_index >= 0){
            return row_index;
        }
        return -1;
    }
}

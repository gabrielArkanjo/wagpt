import { Bard } from "googlebard";

export const getBardResponse = async (prompt) => {
    try{
        let cookies = `__Secure-1PSID=YwhjL6zXviBM0DHFxplScGTsDaYZQqqY2LcHeDKYYjQwsDayh4LQEdZ7xy6thkDkiztmmA.`;
        let bot = new Bard(cookies, {inMemory:true});
        let conversationId = "bardcall";
        let response = await bot.ask(prompt, conversationId);
        if(prompt == 'bardcallresetrequest'){
            bot.resetConversation(conversationId)
        }
        return(response);
    }
    catch(e){
        return (e)
    }
};
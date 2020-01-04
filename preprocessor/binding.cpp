#include <napi.h>
#include <iostream>
#include <string.h>


extern "C"{
  #include "item_preproc.h"
  #include "zbxembed.h"
  #include "log.h"
  #include "common.h"
}

using namespace Napi;

// Global environment
zbx_es_t	es_engine;
int zbx_log_level = LOG_LEVEL_DEBUG;
const char  *help_message[] = {"mock_help_message", NULL};
const char       *progname = "mock_progname";
const char       title_message[] = "mock_title_message";
const char       *usage_message[] = {"mock_usage_message",NULL};

// Rewrite zabbix logger
extern "C" void	__zbx_zabbix_log(int level, const char *fmt, ...){
  long		milliseconds;
  struct tm	tm;
  va_list		args;
  zbx_get_time(&tm, &milliseconds, NULL);

  fprintf(stdout,
      "zbx-preprocessor:%.4d%.2d%.2d:%.2d%.2d%.2d.%03ld ",
      //zbx_get_thread_id(),
      tm.tm_year + 1900,
      tm.tm_mon + 1,
      tm.tm_mday,
      tm.tm_hour,
      tm.tm_min,
      tm.tm_sec,
      milliseconds
      );

  va_start(args, fmt);
  vfprintf(stdout, fmt, args);
  va_end(args);
  fprintf(stdout, "\n");
  fflush(stdout);
}


// input: [item_value, clock, ns, item_value_type, 
//    op_type, op_params, op_error_handler, op_error_handler_params, 
//    history_value, history_clock, history_ns]
Value Preproc(const CallbackInfo& info) {
  Env env = info.Env();

  // unsigned char value_type, zbx_variant_t *value, const zbx_timespec_t *ts,
	//   const zbx_preproc_op_t *op, zbx_variant_t *history_value, zbx_timespec_t *history_ts, char **error


  // last two parameters may be omited
  if (info.Length() != 11) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

    /*
      typedef enum
      {
        ITEM_VALUE_TYPE_FLOAT = 0,
        ITEM_VALUE_TYPE_STR,
        ITEM_VALUE_TYPE_LOG,
        ITEM_VALUE_TYPE_UINT64,
        ITEM_VALUE_TYPE_TEXT,
        // the number of defined value types
        ITEM_VALUE_TYPE_MAX,
        ITEM_VALUE_TYPE_NONE,
      }
      zbx_item_value_type_t;
    */


  unsigned char value_type;
  zbx_variant_t value, history_value;
  zbx_timespec_t ts, history_ts;

  zbx_timespec(&ts);


  zbx_preproc_op_t op;
  char* error = NULL;

  // [item_value, item_value_type, op_type, op_params, op_error_handler, op_error_handler_params, history_value, history_ts]

  //item_value
  if (!info[0].IsString()){
    Napi::TypeError::New(env, "Wrong arguments: 0 - item_value should be string").ThrowAsJavaScriptException();
    return env.Null();
  }
  value.data.str = strdup(info[0].As<String>().Utf8Value().data());
  value.type = ZBX_VARIANT_STR;

  //ts.sec = clock 
  if (info[1].IsNumber()){
    ts.sec = info[1].As<Number>().Int32Value();
  }
  //ts.ns = ns 
  if (info[2].IsNumber()){
    ts.ns = info[2].As<Number>().Int32Value();
  }
  
  // item_value_type
  if (!info[3].IsNumber()){
    Napi::TypeError::New(env, "Wrong arguments: 3 - item_value_type should be a Number").ThrowAsJavaScriptException();
    return env.Null();
  }
  value_type = info[3].As<Number>().Uint32Value(); //ITEM_VALUE_TYPE_STR;

  //op_type
  if (!info[4].IsNumber()){
    Napi::TypeError::New(env, "Wrong arguments: 4 - op_type should be a Number").ThrowAsJavaScriptException();
    return env.Null();
  }
  op.type = info[4].As<Number>().Uint32Value();


  //op_params
  if (!info[5].IsString()){
    Napi::TypeError::New(env, "Wrong arguments: 5 - op_params should be a String").ThrowAsJavaScriptException();
    return env.Null();
  }
  op.params = strdup(info[5].As<String>().Utf8Value().data());

  // op_error_handler
  if (!info[6].IsNumber()){
    Napi::TypeError::New(env, "Wrong arguments: 6 - op_error_handler should be a Number").ThrowAsJavaScriptException();
    return env.Null();
  }
  op.error_handler = info[6].As<Number>().Uint32Value();

  //op_error_handler_params
  if (!info[7].IsString()){
    Napi::TypeError::New(env, "Wrong arguments: 7 - op_error_handler_params should be a String").ThrowAsJavaScriptException();
    return env.Null();
  }
  op.error_handler_params = strdup(info[7].As<String>().Utf8Value().data());


  //history_value
  if (!info[8].IsString()){
    Napi::TypeError::New(env, "Wrong arguments: 8 - history_value should be a String").ThrowAsJavaScriptException();
    return env.Null();
  }
  history_value.data.str = strdup(info[8].As<String>().Utf8Value().data());
  history_value.type = ZBX_VARIANT_STR;
  
  // check if history value is empty
  if(
    op.type == ZBX_PREPROC_DELTA_VALUE ||
    op.type == ZBX_PREPROC_DELTA_SPEED ||
    op.type == ZBX_PREPROC_THROTTLE_VALUE ||
    op.type == ZBX_PREPROC_THROTTLE_TIMED_VALUE ||
    op.type == ZBX_PREPROC_SCRIPT
  ){
    if(strlen(history_value.data.str) == 0){
      Napi::TypeError::New(env, "Wrong arguments: 8 - history_value should be a nonempty String").ThrowAsJavaScriptException();
      return env.Null();
    }
  }

  // check if history_ts is empty
  if(
   op.type == ZBX_PREPROC_DELTA_VALUE ||
   op.type == ZBX_PREPROC_DELTA_SPEED ||
   op.type == ZBX_PREPROC_THROTTLE_VALUE ||
   op.type == ZBX_PREPROC_THROTTLE_TIMED_VALUE
  ){
      //history_ts.sec = historyClock 
    if (info[9].IsNumber()){
      history_ts.sec = info[9].As<Number>().Int32Value();
    }else{
      Napi::TypeError::New(env, "Wrong arguments: 9 - history_ts.sec should be a Number").ThrowAsJavaScriptException();
      return env.Null();
    }

    if(history_ts.sec <= 0){
      Napi::TypeError::New(env, "Wrong arguments: 9 - history_ts.sec should be greater than 0").ThrowAsJavaScriptException();
      return env.Null();
    }

    //history_ts.ns = historyNs 
    if (info[10].IsNumber()){
      history_ts.ns = info[10].As<Number>().Int32Value();
    }else{
      history_ts.ns = 0;
    }
  }


/* //Debug
  std::cout<<std::endl<<"Start!"<<std::endl
  <<"value.data.str: "<<value.data.str<<std::endl
  <<"ts.sec: "<<ts.sec<<" ts.ns: "<<ts.ns<<std::endl
  <<"item_value_type: "<<(int)value_type<<std::endl
  <<"value: zbx_variant_value_desc: "<<zbx_variant_value_desc(&value)<<std::endl
  <<"value: zbx_variant_type_desc: "<<zbx_variant_type_desc(&value)<<std::endl
  <<"op_type: "<<(int)op.type<<std::endl
  <<"op_params: "<<op.params<<std::endl
  <<"op_error_handler: "<<(int)op.error_handler<<std::endl
  <<"op_error_handler_params: "<<op.error_handler_params<<std::endl
  <<"history_value.data.str: "<<history_value.data.str<<std::endl
  <<"history_ts.sec: "<<history_ts.sec<<" history_ts.ns: "<<history_ts.ns<<std::endl
  <<"history_value: zbx_variant_value_desc: "<<zbx_variant_value_desc(&history_value)<<std::endl
  <<"history_value: zbx_variant_type_desc: "<<zbx_variant_type_desc(&history_value)<<std::endl
  <<"ts.sec: "<<(unsigned long)ts.sec<<" ts.ns: "<<(unsigned long)ts.ns<<std::endl
  <<std::endl;
*/

  int returned_ret=-100;
  if (FAIL == (returned_ret = zbx_item_preproc(value_type, &value, &ts, &op, &history_value, &history_ts, &error)))
		returned_ret = zbx_item_preproc_handle_error(&value, &op, &error);


/* //Debug
  std::cout
  <<"Finish:"<<std::endl
  <<"returned_ret: "<<returned_ret<<std::endl
  //<<"error: "<<error<<std::endl
  <<"value_type: "<<(int)value_type<<std::endl
  <<"zbx_variant_value_desc: "<<zbx_variant_value_desc(&value)<<std::endl
  <<"zbx_variant_type_desc: "<<zbx_variant_type_desc(&value)<<std::endl
  ;
*/
  char * resultStr;
  if(value.type == ZBX_VARIANT_NONE){
    resultStr = "Shit happens!";
  }else{
    // convert value to string
    zbx_variant_convert(&value, ZBX_VARIANT_STR);
    resultStr = value.data.str;
  }
  
  return String::New(env, resultStr);
}

Object Init(Env env, Object exports) {
  exports.Set(String::New(env,"preproc"), Function::New(env, Preproc));
  return exports;
}
NODE_API_MODULE(binding, Init)
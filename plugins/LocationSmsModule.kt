package PACKAGE_NAME

import android.Manifest
import android.content.pm.PackageManager
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class LocationSmsModule(private val context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
 override fun getName()="LocationSms"
 @ReactMethod fun send(number:String,message:String,promise:Promise){
  if(ContextCompat.checkSelfPermission(context,Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED){promise.reject("PERMISSION","SEND_SMS not granted");return}
  if(!Regex("^01[0-9]{8,9}$").matches(number)){promise.reject("NUMBER","Invalid Korean mobile number");return}
  if(message.isBlank()||message.length>1000){promise.reject("MESSAGE","Invalid message length");return}
  try {val manager=context.getSystemService(SmsManager::class.java);val parts=manager.divideMessage(message);manager.sendMultipartTextMessage(number,null,parts,null,null);promise.resolve(true)}catch(e:Exception){promise.reject("SMS_ERROR",e)}
 }
}
class LocationSmsPackage:ReactPackage{
 override fun createNativeModules(context:ReactApplicationContext):List<NativeModule> = listOf(LocationSmsModule(context))
 override fun createViewManagers(context:ReactApplicationContext):List<ViewManager<*,*>> = emptyList()
}

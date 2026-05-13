import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../../src/hooks/usePortfolio';
const C={bg:'#0a0a0a',surface:'#141414',border:'#1e1e1e',accent:'#f5c842',text:'#ffffff',muted:'#888888',green:'#22c55e',red:'#ef4444'};
function fmt(v){return v>=1000?'$'+(v/1000).toFixed(1)+'k':'$'+v.toFixed(2);}
function pct(v){return(v>=0?'+':'')+v.toFixed(1)+'%';}
export default function PortfolioScreen(){
  const [r,setR]=useState(false);
  const {data,isLoading,refetch}=usePortfolio();
  const onRefresh=async()=>{setR(true);await refetch();setR(false);};
  if(isLoading&&!data)return(<SafeAreaView style={{flex:1,backgroundColor:C.bg,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={C.accent} size="large"/></SafeAreaView>);
  const tv=data?.totalValue??0,tc=data?.totalCost??0,gl=tv-tc,gp=tc>0?(gl/tc)*100:0;
  const cats=data?.categories??[],movers=data?.topMovers??[];
  return(
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:32}} refreshControl={<RefreshControl refreshing={r} onRefresh={onRefresh} tintColor={C.accent}/>}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <Text style={{fontSize:24,fontWeight:'700',color:C.text}}>Portfolio</Text>
          <Pressable onPress={onRefresh}><Ionicons name="refresh-outline" size={22} color={C.muted}/></Pressable>
        </View>
        <View style={{backgroundColor:C.surface,borderRadius:16,padding:24,marginBottom:20,borderWidth:1,borderColor:C.border,alignItems:'center'}}>
          <Text style={{color:C.muted,fontSize:13}}>Total Value</Text>
          <Text style={{fontSize:40,fontWeight:'800',color:C.accent,marginVertical:4}}>{fmt(tv)}</Text>
          <Text style={{color:gl>=0?C.green:C.red,fontSize:14,fontWeight:'600'}}>{gl>=0?'+':''}{fmt(gl)} ({pct(gp)}) all time</Text>
        </View>
        {cats.length>0&&<View style={{backgroundColor:C.surface,borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:C.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>By Category</Text>
          {cats.map(cat=><View key={cat.name} style={{marginBottom:12}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
              <Text style={{color:C.text}}>{cat.name}</Text><Text style={{color:C.text,fontWeight:'600'}}>{fmt(cat.value)}</Text>
            </View>
            <View style={{height:6,backgroundColor:C.border,borderRadius:3}}>
              <View style={{height:6,backgroundColor:C.accent,borderRadius:3,width:(Math.min(cat.pct,100)+'%')}}/>
            </View>
          </View>)}
        </View>}
        {movers.length>0&&<View style={{backgroundColor:C.surface,borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:C.border}}>
          <Text style={{fontSize:13,fontWeight:'700',color:C.muted,marginBottom:12,textTransform:'uppercase',letterSpacing:1}}>Top Movers</Text>
          {movers.map(m=><View key={m.name} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border}}>
            <Text style={{color:C.text,flex:1}} numberOfLines={1}>{m.name}</Text>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{color:C.text,fontWeight:'600'}}>{fmt(m.value)}</Text>
              <Text style={{color:m.change>=0?C.green:C.red,fontWeight:'700'}}>{pct(m.change)}</Text>
            </View>
          </View>)}
        </View>}
        {tv===0&&!isLoading&&<View style={{alignItems:'center',paddingVertical:60}}>
          <Ionicons name="pie-chart-outline" size={48} color={C.muted}/>
          <Text style={{fontSize:18,fontWeight:'700',color:C.text,marginTop:12}}>No items yet</Text>
          <Text style={{color:C.muted,textAlign:'center',marginTop:8}}>Add items to your Vault to track portfolio value.</Text>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

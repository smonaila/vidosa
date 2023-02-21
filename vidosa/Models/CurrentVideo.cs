using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace vidosa.Models
{
    [JsonObject(MemberSerialization.OptIn)]
    public class CurrentVideo
    {
        [JsonProperty(PropertyName = "videoId")]
        public string VideoId { get; set; }
        
        public string Path { get; set; }
        [JsonProperty(PropertyName = "bandwidth")]
        public string Bandwidth { get; set; }
        [JsonProperty(PropertyName = "start")]
        public double Start { get; set; }
        [JsonProperty(PropertyName = "end")]
        public double End { get; set; }
        [JsonProperty(PropertyName = "streamId")]
        public string StreamId { get; set; }
        [JsonProperty(PropertyName = "isInitialization")]
        public bool IsInitialization { get; set; }
        [JsonProperty(PropertyName = "content")]
        public List<byte> Content { get; set; }
        [JsonProperty(PropertyName = "senderId")]
        public string SenderId { get; set; }
        [JsonProperty(PropertyName = "IsLastSegment")]
        public bool IsLastSegment { get; set; }
        [JsonProperty(PropertyName = "segIndex")]
        public int SegIndex { get; set; }
        [JsonProperty(PropertyName = "representationId")]
        public int Representation { get; set; }
        [JsonProperty(PropertyName = "segSize")]
        public int Size { get; set; }
    }

    public class BitStream
    {

    }
}
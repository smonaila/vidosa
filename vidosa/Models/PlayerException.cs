using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Serialization;

namespace vidosa.Models
{
    public class PlayerException : Exception
    {
        public PlayerException()
        {

        }
        public PlayerException(string message) : base(message)
        {

        }
        public PlayerException(string message, Exception inner) : base(message, inner) { }

        protected PlayerException(SerializationInfo info, StreamingContext context) : base(info, context)
        {

        }
    }

    public class StreamingException : Exception
    {
        public string VideoId { get; set; }
        public StreamingException()
        {
            // VideoId 
        }

        public StreamingException(string message, string videoId)
        {
            VideoId = videoId;
        }

        public StreamingException(string message) : base(message)
        {

        }

        public StreamingException(string message, Exception inner) : base(message, inner) { }

        protected StreamingException(SerializationInfo info, StreamingContext context) : base(info, context)
        {

        }
    }
}